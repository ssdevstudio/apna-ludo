const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let audioCtx: AudioContext | null = null;
function getCtx() { if (!audioCtx) audioCtx = new AudioCtx(); return audioCtx; }
function loadBool(key: string, def: boolean): boolean { try { const v = localStorage.getItem(key); return v === null ? def : v === "true"; } catch { return def; } }
export const soundEnabled = { current: loadBool("apna-sound", true) };

export function playSound(type: "dice"|"move"|"capture"|"win"|"turn"|"click"|"enter"|"six"|"star"|"land") {
  if (!soundEnabled.current) return;
  try {
    const ctx = getCtx();
    const n = ctx.currentTime;
    if (type==="win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.value=f;g.gain.setValueAtTime(.15,n+i*.18);
        g.gain.exponentialRampToValueAtTime(.001,n+i*.18+.25);
        o.start(n+i*.18);o.stop(n+i*.18+.25);
      });
      return;
    }
    if (type==="six") {
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.type="sine";o.frequency.setValueAtTime(880,n);o.frequency.exponentialRampToValueAtTime(1320,n+.12);
      g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.15);
      o.start(n);o.stop(n+.15);
      return;
    }
    if (type==="star") {
      [880,1108.73,1318.51,1760].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.value=f;g.gain.setValueAtTime(.08,n+i*.06);
        g.gain.exponentialRampToValueAtTime(.001,n+i*.06+.1);
        o.start(n+i*.06);o.stop(n+i*.06+.1);
      });
      return;
    }
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); gain.gain.setValueAtTime(.12, n);
    gain.gain.exponentialRampToValueAtTime(.001, n+.22);
    if (type==="dice") {
      gain.gain.setValueAtTime(.0, n);
      for(let i=0;i<8;i++){
        const o2=ctx.createOscillator(),g2=ctx.createGain();
        o2.connect(g2);g2.connect(ctx.destination);
        o2.type="square";o2.frequency.value=400+Math.random()*400;
        g2.gain.setValueAtTime(.08,n+i*.06);
        g2.gain.exponentialRampToValueAtTime(.001,n+i*.06+.05);
        o2.start(n+i*.06);o2.stop(n+i*.06+.06);
      }
      return;
    }
    else if (type==="land") {
      osc.type="square";
      osc.frequency.setValueAtTime(200,n);
      osc.frequency.exponentialRampToValueAtTime(50,n+.05);
      gain.gain.setValueAtTime(.2, n);
      gain.gain.exponentialRampToValueAtTime(.001, n+.06);
      osc.start(n); osc.stop(n+.07);
    }
    else if (type==="move") { osc.frequency.setValueAtTime(500,n); osc.frequency.exponentialRampToValueAtTime(800,n+.08); osc.start(n); osc.stop(n+.1); }
    else if (type==="capture") { 
      osc.type="square"; osc.frequency.setValueAtTime(800,n); osc.frequency.exponentialRampToValueAtTime(100,n+.3); 
      gain.gain.setValueAtTime(.2, n); gain.gain.exponentialRampToValueAtTime(.001, n+.3);
      osc.start(n); osc.stop(n+.3);
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.type="sawtooth"; o2.frequency.setValueAtTime(400,n); o2.frequency.exponentialRampToValueAtTime(50,n+.25);
      g2.gain.setValueAtTime(.15,n); g2.gain.exponentialRampToValueAtTime(.001,n+.3);
      o2.start(n); o2.stop(n+.3);
    }
    else if (type==="turn") { osc.frequency.value=660; gain.gain.setValueAtTime(.1,n); gain.gain.exponentialRampToValueAtTime(.001,n+.1); osc.start(n); osc.stop(n+.1); }
    else { osc.frequency.value=800; osc.start(n); osc.stop(n+.05); }
  } catch {}
}
