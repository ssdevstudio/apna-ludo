export function Logo({ compact=false }: { compact?:boolean }) {
  return <a className={`logo ${compact?"logo--compact":""}`} href="/" aria-label="Apna Ludo home">
    <span className="logo-mark" aria-hidden><i/><i/><i/><i/></span>
    <span><b>APNA</b><em>LUDO</em></span>
  </a>;
}
