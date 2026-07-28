# APNA LUDO PROJECT AUDIT

## 1. Folder Structure Overview

The project is organized as a monorepo containing three main workspaces:

- `client/`: React + Vite frontend application.
- `server/`: Node.js + Socket.IO backend server.
- `shared/`: Shared TypeScript logic for game rules, board definitions, and Zod schemas for network protocols.

## 2. Current Component Tree

The frontend is currently built primarily as a single large component inside `client/src/App.tsx`. 

```text
App
  ↓
  ├── Lobby / Join Screen
  │     └── Name Input & Room Code Input
  │
  └── GameScreen
        ├── Room Header
        │     ├── Room Code & Copy Button
        │     ├── Settings Button
        │     ├── Chat Toggle Button
        │     └── Reaction Picker Toggle
        │
        ├── PlayerCards (Top & Side Panels)
        │     ├── Avatar & Name
        │     ├── Connection Status
        │     └── Dice Roll Button & Badge
        │
        ├── BoardContainer
        │     ├── LudoBoard (SVG / CSS Grid)
        │     │     ├── Safe Cells / Star Cells
        │     │     ├── Player Yards (Home Areas)
        │     │     └── Tokens (Dynamically Positioned)
        │     │
        │     └── Turn Indicator / Yard Blink Overlay
        │
        ├── Chat Panel (Slide-out)
        │     ├── Messages List
        │     └── Input Form
        │
        ├── Emoji Popup (Overlay)
        │
        └── Victory Modal (Game Over)
              └── Rankings & Rematch Controls
```

*Recommendation*: Break `App.tsx` into discrete files reflecting this exact tree in Phase 1B.

## 3. State Ownership

State is deeply coupled in `App.tsx`. State must be cleanly separated into these domains:

```text
Board State (Shared GameState from Server)
  ↓
React State (Local UI state like modal open/close)
  ↓
Socket State (Connection status, Ping, Latency)
  ↓
Animation State (tokenAnimation ID, boardShake flag)
  ↓
Audio State (Current playing sounds, Volume, Mute)
  ↓
Transient UI State (Input values, Reaction picker open)
```

## 4. Game State Architecture (Server)

The game state is completely deterministic and strictly controlled by the server. Defined in `shared/src/game.ts`.

- **State Tree**: `GameState` contains phase, revision, players, currentPlayerId, dice, movableTokenIds, consecutiveSixes, winners, and lastAction.
- **Idempotency/Syncing**: The state relies on an `expectedRevision` model. The client sends the revision it knows, and if it's stale, the server rejects the action and forces a re-sync.

## 5. WebSocket Flow

Real-time communication is managed via Socket.IO, defined in `shared/src/protocol.ts`.

- **Client to Server**: `room:create`, `room:join`, `room:ready`, `game:roll`, `game:move`, `chat:send`, `room:react`.
- **Server to Client**:
  - `room:snapshot`: Broadcasts the complete `RoomSnapshot`.
  - `chat:message`: Broadcasts incoming chat messages.
  - `room:reaction`: Broadcasts emoji reactions.
  - `server:error`: Delivers error alerts.

## 6. Audio Engine & Philosophy

Currently, audio is implemented using a raw, inline Web Audio API implementation inside `App.tsx` (`playSound` function).

**Audio Philosophy**:
- Only one primary SFX plays at once.
- Ambient sounds may overlap.
- No clipping.
- No distortion.
- No delay.

*Recommendation for Audio Phase*: An `AudioEngine` singleton should be created to manage HTML5 Audio/Web Audio nodes with channels, volume sliders, and asset preloading.

## 7. Asset Inventory & Rules

Current assets are minimal and lack structure:

```text
public/
  ├── tokens/ (token-red.png, token-blue.png, etc.)
  ├── avatars/ (avatar1.png, bot-avatar.png)
  └── board/ (ludo-board.svg)
```

**Asset Rules**:
- Assets must be `SVG` or `2x PNG`.
- Maximum size `256 KB`.
- No blurry assets.
- No stretched images.
- No watermark.

*Missing Assets Needed for Premium Feel*:
- `assets/dice/` (3D or premium sprites if not CSS)
- `assets/emoji/` (High-res animated SVGs)
- `assets/sounds/` (Actual .mp3 or .wav files for dice, move, kill, win, chat)
- `assets/particles/` (Capture/Win effects)
- `assets/fonts/` (Premium typography like Inter or Poppins)

## 8. CSS Map

Current styling is monolithic:
- `client/src/index.css`: Global resets, font imports (`DM Mono`, `Yeseva One`), base variables.
- `client/src/styles.css`: 100% of all component styles (Layout, Board, Chat, Modals, Animations).

*Recommendation*: Needs splitting into CSS modules or styled-components per UI Component Tree node during Phase 1C.

## 9. Animation Inventory

| Animation Name | Duration | Trigger | Used By |
| --- | --- | --- | --- |
| `diceFloat` | 2s (infinite) | Dice Idle | `.die` |
| `diceRollJump` | 0.5s | Roll Action | `.die--rolling` |
| `diceRattle` | 0.1s (infinite) | Roll Action | `.die-inner` |
| `diceGlowPulse` | 1.5s (infinite) | Active Turn | `.die--active` |
| `borderGlow` | 1.5s (infinite) | Active Turn | `.turn-highlight-border` |
| `tokenSelectBounce`| 1s (infinite) | Selectable Token | `.premium-pulse` |
| `tokenMultiHop` | 0.1s (infinite)| Token Moving | `.token-hop` |
| `safeCellGlow` | 2s (infinite) | Safe Cell | `.safe-cell`, `.star-cell` |
| `cameraPunch` | 0.3s | Capture Action | `.board-shake` |
| `popupOpen` | 0.2s | Emoji Click | `.emoji-grid-popup` |
| `fall` (Confetti)| 3s (infinite) | Game Over | `.confetti` |

## 10. Performance Baseline & Budget

*(Estimations based on current Vite + React build)*

**Performance Budget**:
- Target FPS: 60
- Minimum FPS: 55
- Input latency: < 80ms
- Dice animation: < 900ms
- Token movement: < 1200ms
- Emoji popup: < 200ms

**Current Baseline**:
- **FPS**: Variable (45-60 FPS during heavy CSS transforms).
- **JS Bundle**: ~112kB (Gzipped) - Extremely lean, but lacks animation libraries.
- **CSS Size**: ~7.4kB (Gzipped).
- **Rerenders**: Heavy. `App.tsx` rerenders entirely on every Socket ping and state change.

## 11. Current UX Problems (Pre-Phase 1)

| Feature | Rating | Reason |
| --- | --- | --- |
| **Dice** | ⭐⭐☆☆☆ | CSS 3D is okay, but lacks real physics and premium feel. |
| **Board Glow** | ⭐⭐☆☆☆ | Basic border glow is implemented, needs more dynamic lighting. |
| **Player Card** | ⭐⭐⭐☆☆ | Functional, but layout is basic and unpolished. |
| **Emoji** | ⭐⭐☆☆☆ | Good grid popup, but floating animation lacks physics and variation. |
| **Chat** | ⭐⭐⭐☆☆ | Functional slide-out, but lacks unread indicators and modern bubbles. |
| **Sounds** | ⭐☆☆☆☆ | Web Audio synthesis sounds like an 8-bit game, not a premium mobile app. |
| **Animation** | ⭐⭐☆☆☆ | CSS keyframes are jittery and lack proper easing curves and timing control. |

## 12. Risk Register

**HIGH RISK (DO NOT MODIFY UNLESS REQUIRED)**
- **Board Coordinate Rewrite**: Breakage means tokens move to wrong squares.
- **Socket Timing/Revision Sync**: Breakage means game desyncs and freezes.
- **Dice Logic (Server)**: Affects game fairness.

**MEDIUM RISK**
- **CSS Refactor (Phase 1C)**: Splitting `styles.css` might break `z-index` stacking contexts.
- **Animation Engine (Phase 2)**: Intercepting token moves requires careful synchronization with Server State.

**LOW RISK**
- **Emoji System**: Purely visual and transient.
- **Audio Engine**: Independent subsystem.
- **Hover/Cursor Polish**: Pure CSS visual layer.

## 13. Implementation Strategy & Phase Mapping

*Mandatory Rule: After completing each phase, a `PHASE_X_REPORT.md` must be generated detailing files changed, tests passed, performance metrics, and risks.*

| Module | Status | Risk | Phase |
| --- | --- | --- | --- |
| **UI Folders** | Create layout | Low | 1A |
| **UI Components**| Split App.tsx | Med | 1B |
| **UI Styling** | Split CSS | Med | 1C |
| **Animation** | Rewrite | Medium| 2 |
| **Audio** | Rewrite | Low | 3 |
| **Dice** | Improve | Low | 4 |
| **Board** | Improve | Low | 8 |
| **Emoji** | Rewrite | Low | 9 |
| **Chat** | Improve | Low | 11 |
| **Socket** | Stable | High | Never |

---
**Status**: Ready for Phase 1A (Folder Restructure).
