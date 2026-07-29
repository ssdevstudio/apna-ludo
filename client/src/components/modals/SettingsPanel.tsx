import { useState } from "react";
import { soundEnabled } from "../../utils/audio";
import { lang, tr } from "../../utils/i18n";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [snd, setSnd] = useState(soundEnabled.current);
  const [lng, setLng] = useState(lang.current);
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel" role="dialog" aria-modal="true">
        <button className="close-button" onClick={onClose}>×</button>
        <p className="section-kicker">{tr("settings")}</p>
        <h2>{tr("settings")}</h2>
        <div className="setting-row">
          <span>{tr("sound")}</span>
          <button className={`toggle ${snd ? "toggle--on" : ""}`} onClick={() => { soundEnabled.current = !soundEnabled.current; setSnd(soundEnabled.current); try { localStorage.setItem("apna-sound", String(soundEnabled.current)); } catch { } }}>
            <span className="toggle-knob" />
          </button>
        </div>
        <div className="setting-row">
          <span>{tr("language")}</span>
          <button className="lang-btn" onClick={() => { lang.current = lng === "en" ? "hi" : "en"; setLng(lang.current); try { localStorage.setItem("apna-lang", lang.current); } catch { } }}>
            <span className={lng === "en" ? "lang-active" : ""}>EN</span>
            <span className={lng === "hi" ? "lang-active" : ""}>हि</span>
          </button>
        </div>
        <p className="setting-note">Apna Ludo v1.0</p>
      </div>
    </div>
  );
}
