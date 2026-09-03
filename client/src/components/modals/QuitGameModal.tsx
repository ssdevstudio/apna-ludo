import { useState, useEffect } from "react";
import { soundEnabled, toggleSound } from "../../utils/audio";

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function QuitGameModal({ isOpen, onConfirm, onCancel }: Props) {
  const [soundOn, setSoundOn] = useState(soundEnabled.current);

  useEffect(() => {
    const handler = (e: any) => setSoundOn(e.detail);
    window.addEventListener("sound-toggled", handler);
    return () => window.removeEventListener("sound-toggled", handler);
  }, []);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  return (
    <div className="quit-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
      <div className="quit-modal-box" role="dialog" aria-modal="true" aria-labelledby="quit-dialog-title">
        <h2 id="quit-dialog-title" className="quit-modal-title">QUIT GAME?</h2>
        
        <div className="quit-modal-actions">
          <button 
            type="button" 
            className="quit-btn quit-btn-action quit-btn-yes" 
            onClick={onConfirm}
            aria-label="Yes, quit game"
          >
            Yes
          </button>

          <button 
            type="button" 
            className="quit-btn quit-btn-sound" 
            onClick={handleToggleSound}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
            title={soundOn ? "Sound ON (Tap to Mute)" : "Sound OFF (Tap to Unmute)"}
          >
            {soundOn ? (
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="#ffc800" stroke="#78350f" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" stroke="#ffc800" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="#ffc800" stroke="#78350f" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="18" cy="12" r="4.2" fill="#ffc800" stroke="#78350f" strokeWidth="1.2"/>
                <path d="M16.5 10.5L19.5 13.5M19.5 10.5L16.5 13.5" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          <button 
            type="button" 
            className="quit-btn quit-btn-action quit-btn-no" 
            onClick={onCancel}
            aria-label="No, continue game"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}
