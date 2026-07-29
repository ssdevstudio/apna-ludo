import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('apna-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('apna-theme', theme);
  }, [theme]);

  const toggle = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  return (
    <button 
      className="icon-btn theme-toggle-btn" 
      onClick={toggle}
      title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
      aria-label="Toggle Theme"
      style={{
        fontSize: '18px',
        width: '36px',
        height: '36px',
        flexShrink: 0,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        color: 'var(--text-primary)',
        marginRight: '8px'
      }}
    >
      {theme === 'light' ? "🌙" : "☀️"}
    </button>
  );
}
