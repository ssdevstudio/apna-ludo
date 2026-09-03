const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let audioCtx: AudioContext | null = null;
let diceBuffer: AudioBuffer | null = null;
let diceBufferLoading = false;

const baseDiceAudio = typeof Audio !== "undefined" ? new Audio("/assets/sounds/dice-sound.mp3") : null;
if (baseDiceAudio) {
  baseDiceAudio.preload = "auto";
}

function loadDiceBuffer(ctx: AudioContext) {
  if (diceBuffer || diceBufferLoading || typeof fetch === "undefined") return;
  diceBufferLoading = true;
  fetch("/assets/sounds/dice-sound.mp3")
    .then(res => {
      if (!res.ok) throw new Error("Audio fetch failed: " + res.status);
      return res.arrayBuffer();
    })
    .then(data => ctx.decodeAudioData(data))
    .then(buf => {
      diceBuffer = buf;
      diceBufferLoading = false;
    })
    .catch(() => {
      diceBufferLoading = false;
    });
}

function getCtx() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
    loadDiceBuffer(audioCtx);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}
function loadBool(key: string, def: boolean): boolean { try { const v = localStorage.getItem(key); return v === null ? def : v === "true"; } catch { return def; } }
export const soundEnabled = { current: loadBool("apna-sound", true) };

export function isSoundEnabled(): boolean {
  return soundEnabled.current;
}

export function setSoundEnabled(val: boolean): boolean {
  soundEnabled.current = val;
  try {
    localStorage.setItem("apna-sound", String(val));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sound-toggled", { detail: val }));
  }
  return val;
}

export function toggleSound(): boolean {
  return setSoundEnabled(!soundEnabled.current);
}

export function playSound(type: "dice"|"move"|"capture"|"win"|"lose"|"turn"|"click"|"enter"|"six"|"star"|"land") {
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
    if (type==="lose") {
      [392.00, 349.23, 311.13, 261.63].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.type="triangle";
        o.frequency.value=f;g.gain.setValueAtTime(.15,n+i*.22);
        g.gain.exponentialRampToValueAtTime(.001,n+i*.22+.3);
        o.start(n+i*.22);o.stop(n+i*.22+.3);
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
    if (type === "dice") {
      let played = false;
      if (diceBuffer) {
        try {
          const source = ctx.createBufferSource();
          source.buffer = diceBuffer;
          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.85, ctx.currentTime);
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          source.start(0);
          played = true;
        } catch {}
      }
      if (!played && baseDiceAudio) {
        try {
          baseDiceAudio.currentTime = 0;
          baseDiceAudio.play().catch(() => {
            const clone = baseDiceAudio.cloneNode(true) as HTMLAudioElement;
            clone.play().catch(() => {});
          });
          played = true;
        } catch {}
      }
      if (!diceBuffer && !diceBufferLoading) {
        loadDiceBuffer(ctx);
      }
      return;
    }
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); gain.gain.setValueAtTime(.12, n);
    gain.gain.exponentialRampToValueAtTime(.001, n+.22);
    if (type==="move") { osc.frequency.setValueAtTime(500,n); osc.frequency.exponentialRampToValueAtTime(800,n+.08); osc.start(n); osc.stop(n+.1); }
    else if (type==="capture") { osc.type="sawtooth"; osc.frequency.setValueAtTime(400,n); osc.frequency.exponentialRampToValueAtTime(150,n+.25); osc.start(n); osc.stop(n+.3); }
    else if (type==="turn") { osc.frequency.value=660; gain.gain.setValueAtTime(.1,n); gain.gain.exponentialRampToValueAtTime(.001,n+.1); osc.start(n); osc.stop(n+.1); }
    else { osc.frequency.value=800; osc.start(n); osc.stop(n+.05); }
  } catch {}
}
