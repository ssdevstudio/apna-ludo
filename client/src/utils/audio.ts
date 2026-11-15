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

export function playSound(type: "dice"|"move"|"capture"|"win"|"lose"|"turn"|"click"|"enter"|"six"|"star"|"land"|"coin"|"levelUp"|"ladder"|"snake"|"pop"|"tick"|"home") {
  if (!soundEnabled.current) return;
  try {
    const ctx = getCtx();
    const n = ctx.currentTime;
    if (type === "home") {
      // Authentic Ludo King celebratory home pocketing fanfare & bell chime
      [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = i < 3 ? "triangle" : "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.18, n + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, n + i * 0.07 + 0.35);
        o.start(n + i * 0.07); o.stop(n + i * 0.07 + 0.4);
      });
      [2093.00, 2637.02].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.1, n + 0.42 + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.42 + i * 0.08 + 0.3);
        o.start(n + 0.42 + i * 0.08); o.stop(n + 0.42 + i * 0.08 + 0.35);
      });
      return;
    }
    if (type === "enter") {
      // Cheerful pop & spring when token leaves yard
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(360, n);
      o.frequency.exponentialRampToValueAtTime(920, n + 0.09);
      g.gain.setValueAtTime(0.18, n);
      g.gain.exponentialRampToValueAtTime(0.001, n + 0.15);
      o.start(n); o.stop(n + 0.15);
      return;
    }
    if (type === "pop") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(650, n);
      o.frequency.exponentialRampToValueAtTime(1200, n + 0.05);
      g.gain.setValueAtTime(0.15, n);
      g.gain.exponentialRampToValueAtTime(0.001, n + 0.08);
      o.start(n); o.stop(n + 0.08);
      return;
    }
    if (type === "tick") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "triangle";
      o.frequency.setValueAtTime(1400, n);
      g.gain.setValueAtTime(0.08, n);
      g.gain.exponentialRampToValueAtTime(0.001, n + 0.025);
      o.start(n); o.stop(n + 0.025);
      return;
    }
    if (type === "ladder") {
      // Ascending uplifting ladder glissando
      [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.12, n + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, n + i * 0.05 + 0.18);
        o.start(n + i * 0.05); o.stop(n + i * 0.05 + 0.2);
      });
      return;
    }
    if (type === "snake") {
      // Descending slide / hiss rattle
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sawtooth";
      o.frequency.setValueAtTime(600, n);
      o.frequency.exponentialRampToValueAtTime(120, n + 0.4);
      g.gain.setValueAtTime(0.14, n);
      g.gain.exponentialRampToValueAtTime(0.001, n + 0.45);
      o.start(n); o.stop(n + 0.45);
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.type = "triangle";
      o2.frequency.setValueAtTime(320, n + 0.05);
      o2.frequency.exponentialRampToValueAtTime(80, n + 0.45);
      g2.gain.setValueAtTime(0.1, n + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.001, n + 0.5);
      o2.start(n + 0.05); o2.stop(n + 0.5);
      return;
    }
    if (type==="coin") {
      // Sparkling double coin bell sound (Ludo King style)
      [987.77, 1318.51, 1760.00].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.12, n + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, n + i * 0.08 + 0.18);
        o.start(n + i * 0.08); o.stop(n + i * 0.08 + 0.2);
      });
      return;
    }
    if (type==="levelUp") {
      // Triumphant brass/fanfare chord
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.15, n + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, n + i * 0.1 + 0.35);
        o.start(n + i * 0.1); o.stop(n + i * 0.1 + 0.4);
      });
      return;
    }
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
    else if (type==="capture") {
      // Powerful Ludo King impact crash & sweep
      osc.type="sawtooth";
      osc.frequency.setValueAtTime(520,n);
      osc.frequency.exponentialRampToValueAtTime(110,n+.28);
      gain.gain.setValueAtTime(0.22, n);
      gain.gain.exponentialRampToValueAtTime(.001,n+.32);
      osc.start(n); osc.stop(n+.35);

      // Low impact punch
      const sub = ctx.createOscillator(), subGain = ctx.createGain();
      sub.connect(subGain); subGain.connect(ctx.destination);
      sub.type = "sine";
      sub.frequency.setValueAtTime(160, n);
      sub.frequency.exponentialRampToValueAtTime(45, n + 0.3);
      subGain.gain.setValueAtTime(0.3, n);
      subGain.gain.exponentialRampToValueAtTime(0.001, n + 0.35);
      sub.start(n); sub.stop(n + 0.35);
    }
    else if (type==="turn") { osc.frequency.value=660; gain.gain.setValueAtTime(.1,n); gain.gain.exponentialRampToValueAtTime(.001,n+.1); osc.start(n); osc.stop(n+.1); }
    else { osc.frequency.value=800; osc.start(n); osc.stop(n+.05); }
  } catch {}
}
