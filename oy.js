// oy.js — Оюунсанаа чат (HTML бүтэц эвдэхгүй, drop-in)
(() => {
  // ===== Config =====
  const API_BASE = (window.OY_API_BASE || "").replace(/\/+$/, "");      // e.g. https://api.oyunsanaa.com
  const CHAT_URL = `${API_BASE}/v1/chat`;

  // ===== DOM =====
  const $ = (s, r = document) => r.querySelector(s);
  const el = {
    overlay: $("#oyOverlay"),
    drawer:  $("#oyDrawer"),
    btnDrawer: $("#btnDrawer"),

    stream: $("#oyStream"),
    input:  $("#oyInput"),
    file:   $("#oyFile"),
    send:   $("#btnSend"),
    typing: $("#typing"),

    panes: Array.from(document.querySelectorAll(".oy-pane"))
  };

  // ===== i18n (Wix орчуулга дагана) =====
  const USER_LANG = (window.OY_LANG || document.documentElement.lang || navigator.language || "mn").split("-")[0];

  // ===== Helpers (bubble, typing, autosize) =====
  const bubble = (html, who = "bot") => {
    const d = document.createElement("div");
    d.className = `oy-bubble oy-${who}`;
    d.innerHTML = html || "&nbsp;";
    el.stream.appendChild(d);
    el.stream.scrollTop = el.stream.scrollHeight;
  };
  const typing = (on = true) => { if (el.typing) el.typing.hidden = !on; };

  // textarea autosize
  if (el.input) {
    const auto = () => {
      el.input.style.height = "auto";
      el.input.style.height = Math.min(el.input.scrollHeight, 180) + "px";
    };
    el.input.addEventListener("input", auto);
    queueMicrotask(auto);
  }

  // Drawer toggle
  function openDrawer(open = true) {
    if (!el.drawer) return;
    el.drawer.classList.toggle("open", !!open);
    if (el.overlay) el.overlay.hidden = !open;
  }
  el.btnDrawer && el.btnDrawer.addEventListener("click", () => openDrawer(!el.drawer.classList.contains("open")));
  el.overlay && el.overlay.addEventListener("click", () => openDrawer(false));

  // Sidebar доторх товч → доорх pane нээгдэнэ
  document.querySelectorAll("[data-menu]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.menu;
      const target = el.panes.find(p => p.dataset.pane === key);
      if (!target) return;
      el.panes.forEach(p => p.hidden = (p !== target) ? true : !p.hidden);
    });
  });

  // ===== Local history (optional) =====
  let HISTORY = JSON.parse(localStorage.getItem("oy_hist") || "[]");
  const saveHist = () => localStorage.setItem("oy_hist", JSON.stringify(HISTORY.slice(-20)));

  // ===== File -> dataURL =====
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // ===== API Call =====
  async function callChat({ text = "", images = [], deep = false }) {
    if (!API_BASE) {
      console.error("OY_API_BASE тохируулаагүй!");
      bubble("⚠️ API тохируулаагүй байна. window.OY_API_BASE-г зөв URL болгоно уу.", "bot");
      return;
    }
    typing(true);
    try {
      const forceModel = images.length || deep ? "gpt-4o" : "gpt-4o-mini";
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          images,
          chatHistory: HISTORY.slice(-20),
          userLang: USER_LANG,
          forceModel
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const reply = data?.output?.[0]?.content?.[0]?.text ?? "-";
      bubble(reply, "bot");
      HISTORY.push({ role: "assistant", content: reply }); saveHist();
    } catch (e) {
      console.error(e);
      bubble("⚠️ API холболт амжилтгүй. Сүлжээ эсвэл серверээ шалгана уу.", "bot");
    } finally {
      typing(false);
    }
  }

  // ===== Send current (Enter/товч/файл) =====
  async function sendCurrent() {
    const text = (el.input?.value || "").trim();
    const files = Array.from(el.file?.files || []);
    if (!text && !files.length) return;

    if (text) {
      bubble(text, "user");
      HISTORY.push({ role: "user", content: text }); saveHist();
      el.input.value = ""; el.input.dispatchEvent(new Event("input"));
    }
    if (el.file) el.file.value = "";

    const images = [];
    for (const f of files) if (f.type?.startsWith("image/")) images.push(await fileToDataURL(f));
    await callChat({ text, images, deep: HISTORY.length >= 24 }); // удаан ярьж эхэлбэл deep=true
  }

  el.send && el.send.addEventListener("click", sendCurrent);
  el.input && el.input.addEventListener("keydown", e => {
    if (e.key === "Enter
