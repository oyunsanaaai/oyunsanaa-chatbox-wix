"use client";
import { useState } from "react";

export default function LoginPage(){
  const [email, setEmail] = useState("");
  const [name,  setName ] = useState("");

  async function onSubmit(e:any){
    e.preventDefault();
    await fetch("/api/auth/login", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, name })
    });
    location.href = "/chat";
  }

  return (
    <main style={{display:"grid",placeItems:"center",minHeight:"60vh"}}>
      <form onSubmit={onSubmit} style={{width:360,display:"grid",gap:12}}>
        <h1>Нэвтрэх</h1>
        <input placeholder="И-мэйл" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Нэр (сонголттой)" value={name} onChange={e=>setName(e.target.value)} />
        <button type="submit">Нэвтрэх</button>
        <a href="/api/guest">Эсвэл guest-ээр орох</a>
      </form>
    </main>
  )
}
