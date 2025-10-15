// app/preview/page.jsx
export default function Preview() {
  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f5f7fb"}}>
      <div style={{width:360,padding:24,borderRadius:16,boxShadow:"0 10px 30px rgba(0,0,0,.08)",background:"#fff"}}>
        <h1 style={{fontSize:20,marginBottom:12}}>Оюунсанаа — Чат</h1>
        <p style={{opacity:.8,marginBottom:24}}>Та хэрхэн үргэлжлүүлэх вэ?</p>
        <div style={{display:"grid",gap:12}}>
          <a href="/api/guest" style={{textAlign:"center",padding:"10px 14px",borderRadius:10,background:"#2f6df6",color:"#fff",textDecoration:"none"}}>Шинэ хэрэглэгч</a>
          <a href="/login" style={{textAlign:"center",padding:"10px 14px",border:"1px solid #dcdfea",borderRadius:10,textDecoration:"none"}}>Гишүүн нэвтрэх</a>
        </div>
      </div>
    </main>
  );
}
