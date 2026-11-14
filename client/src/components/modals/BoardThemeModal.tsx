import { useState, useEffect } from "react";
import {
  BOARD_THEMES,
  getActiveBoardTheme,
  setActiveBoardTheme,
  BoardThemeId,
} from "../../utils/boardTheme";
import { playSound } from "../../utils/audio";

interface BoardThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BoardThemeModal({ isOpen, onClose }: BoardThemeModalProps) {
  const [activeTheme, setActiveTheme] = useState<BoardThemeId>(getActiveBoardTheme);

  useEffect(() => {
    if (isOpen) {
      setActiveTheme(getActiveBoardTheme());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectTheme = (id: BoardThemeId) => {
    setActiveTheme(id);
    setActiveBoardTheme(id);
    playSound("click");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="theme-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bonus-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="theme-modal-header">
          <span className="theme-header-icon">🎨</span>
          <h2>BOARD THEMES</h2>
          <p>Customize the look &amp; feel of your Ludo &amp; Snake board!</p>
        </div>

        <div className="theme-cards-grid">
          {BOARD_THEMES.map((theme) => {
            const isSelected = activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                className={`theme-card ${isSelected ? "theme-card--active" : ""}`}
                onClick={() => handleSelectTheme(theme.id)}
              >
                <div
                  className="theme-card-preview"
                  style={{
                    backgroundColor: theme.boardBg,
                    borderColor: theme.borderColor,
                  }}
                >
                  <span className="theme-card-icon">{theme.icon}</span>
                  {isSelected && <span className="theme-selected-check">✓</span>}
                </div>
                <div className="theme-card-info">
                  <b>{theme.name}</b>
                  <p>{theme.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
