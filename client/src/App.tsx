import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { Landing } from "./components/layout/Landing";
import { Room } from "./components/layout/Room";
import { LocalRoom } from "./components/layout/LocalRoom";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";

export default function App() {
  useEffect(()=>{
    // Initialize theme
    const savedTheme = localStorage.getItem('apna-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const onKey=(e:KeyboardEvent)=>{
      if(e.key.toLowerCase()==="r" && !["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        document.querySelector<HTMLButtonElement>(".roll-button:not(:disabled)")?.click();
      }
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing/>}/>
        <Route path="/room/:code" element={<Room/>}/>
        <Route path="/local" element={<LocalRoom/>}/>
        <Route path="*" element={<Landing/>}/>
      </Routes>
    </ErrorBoundary>
  );
}
