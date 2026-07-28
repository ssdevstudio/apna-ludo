# Design System & Token Map

This document defines the strict visual guidelines for Phase 1. All CSS must use these exact variables. No hardcoded hex values or pixel spacing in components.

## 1. Color Palette

```css
:root {
  /* Core Brand Colors */
  --color-red: #ff3b30;
  --color-blue: #007aff;
  --color-green: #34c759;
  --color-yellow: #ffcc00;

  /* UI Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: #f2f2f7;
  --bg-tertiary: #e5e5ea;
  
  /* Board Colors */
  --board-bg: #fafafa;
  --board-line: #d1d1d6;
  --board-safe: #fff6d6;

  /* Typography */
  --text-primary: #1c1c1e;
  --text-secondary: #8e8e93;
  --text-tertiary: #c7c7cc;
  --text-inverse: #ffffff;

  /* Status */
  --status-success: #34c759;
  --status-error: #ff3b30;
  --status-warning: #ffcc00;
  --status-info: #007aff;
}
```

## 2. Typography

All text must use standard sans-serif system fonts or a clean imported font like `Inter`.

```css
:root {
  --font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-family-display: 'Yeseva One', serif;
  --font-family-mono: 'DM Mono', monospace;

  /* Sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.5rem;      /* 24px */
  --text-2xl: 2rem;       /* 32px */
  --text-3xl: 2.5rem;     /* 40px */

  /* Weights */
  --font-regular: 400;
  --font-medium: 500;
  --font-bold: 700;
  --font-black: 900;
}
```

## 3. Spacing System

Strictly adhere to the 4px/8px grid.

```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}
```

## 4. Shadows & Elevation

Used for depth, dice, and token pop.

```css
:root {
  /* Subtle depth for UI panels */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  
  /* Standard depth for cards and popups */
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  
  /* Heavy depth for Dice in air / Active Tokens */
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  
  /* Glowing Effects */
  --shadow-glow-yellow: 0 0 15px rgba(255, 204, 0, 0.6);
  --shadow-glow-white: 0 0 15px rgba(255, 255, 255, 0.8);
}
```

## 5. Border Radius

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px; /* For tokens and circular avatars */
}
```

## 6. Z-Index Scale

To prevent stacking context wars.

```css
:root {
  --z-background: -10;
  --z-board: 0;
  --z-board-highlights: 10;
  --z-tokens: 20;
  --z-tokens-active: 30;
  --z-dice: 40;
  --z-ui-base: 50;
  --z-dropdown: 100;
  --z-modal-overlay: 900;
  --z-modal: 1000;
  --z-emoji-particles: 2000;
}
```
