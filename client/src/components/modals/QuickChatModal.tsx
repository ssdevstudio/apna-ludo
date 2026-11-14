interface QuickChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhrase: (text: string) => void;
}

const QUICK_PHRASES = [
  {
    category: "Taunts & Fun 😈",
    phrases: [
      "Chhakka aaja! 🎲",
      "Jaldi chalo bhai! ⏳",
      "Yeh toh gaya! 😂",
      "Bach ke rehna! 🔥",
      "Khel khatam! 💥",
      "Dice roll karo jaldi! ⚡",
    ],
  },
  {
    category: "Plea & Mercy 🥺",
    phrases: [
      "Maarna mat please! 🥺",
      "Bhai chod de yaar! 🙏",
      "Kismat hi kharab hai! 😭",
      "Galti se nikal gaya! 🙈",
      "Ek aur 6 chahiye! 🍀",
    ],
  },
  {
    category: "Friendly & Praise 👏",
    phrases: [
      "Well played! 👏",
      "Good game! 🏆",
      "Shukriya dost! ✨",
      "Kamaal kar diya! 🌟",
      "Rematch ho jaye? 🔄",
    ],
  },
];

export function QuickChatModal({ isOpen, onClose, onSelectPhrase }: QuickChatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="quick-chat-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quick-chat-header">
          <h3>💬 Quick Phrases</h3>
          <button className="quick-chat-close" onClick={onClose}>✕</button>
        </div>

        <div className="quick-chat-content">
          {QUICK_PHRASES.map((group) => (
            <div key={group.category} className="quick-chat-group">
              <span className="quick-group-title">{group.category}</span>
              <div className="quick-phrase-grid">
                {group.phrases.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    className="quick-phrase-btn"
                    onClick={() => {
                      onSelectPhrase(phrase);
                      onClose();
                    }}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
