import { useState } from "react";
import { soundEnabled, setSoundEnabled } from "../../utils/audio";
import { lang, tr } from "../../utils/i18n";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [snd, setSnd] = useState(soundEnabled.current);
  const [lng, setLng] = useState(lang.current);

  const handleToggleSound = () => {
    const next = !snd;
    setSoundEnabled(next);
    setSnd(next);
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel" role="dialog" aria-modal="true">
        <button className="close-button" onClick={onClose}>×</button>
        <p className="section-kicker">{tr("settings")}</p>
        <h2>{tr("settings")}</h2>
        
        <div className="setting-row">
          <div className="setting-label-group">
            <span className="setting-icon">{snd ? "🔊" : "🔇"}</span>
            <div>
              <div className="setting-title">Game Sound (गेम साउंड)</div>
              <small className="setting-subtitle">{snd ? "Sound is ON (आवाज़ चालू है)" : "Sound is OFF (आवाज़ बंद है)"}</small>
            </div>
          </div>
          <button 
            type="button"
            className={`sound-action-btn ${snd ? "sound-action-btn--on" : "sound-action-btn--off"}`}
            onClick={handleToggleSound}
            aria-label="Toggle game sound"
          >
            {snd ? "🔊 ON" : "🔇 OFF"}
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label-group">
            <span className="setting-icon">🌐</span>
            <div>
              <div className="setting-title">{tr("language")} (भाषा)</div>
              <small className="setting-subtitle">{lng === "en" ? "English" : "हिन्दी"}</small>
            </div>
          </div>
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
