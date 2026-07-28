# APNA LUDO PROJECT AUDIT

## 1. Folder Structure Overview

The project is organized as a monorepo containing three main workspaces:

- `client/`: React + Vite frontend application.
- `server/`: Node.js + Socket.IO backend server.
- `shared/`: Shared TypeScript logic for game rules, board definitions, and Zod schemas for network protocols.

## 2. Components (Client-Side)

The frontend is currently built primarily as a single large component inside `client/src/App.tsx`, which contains multiple sub-components and logic blocks:

- **`App`**: Main state container and router (handles lobby, room creation, joining, and active game screens).
- **`LudoBoard`**: Renders the game board grid, player yards, safe cells, and token positioning.
- **Tokens/Pawns**: Rendered dynamically based on the state array, positioned absolutely over the board using `transform: translate`.
- **Chat/Reactions**: Side panel for text chat and a floating overlay for emoji reactions.
- **Game Over/Modals**: Victory screen and rematch prompts.

*Recommendation for UI Architecture Phase*: `App.tsx` is bloated. The rendering components (Board, Dice, PlayerCards, Tokens) should be split into smaller, reusable React components under `client/src/components/`.

## 3. Game State Architecture

The game state is completely deterministic and strictly controlled by the server. The state definitions live in `shared/src/game.ts`.

- **State Tree**: `GameState` contains phase (`playing`, `finished`), `revision` (for syncing), `players`, `currentPlayerId`, `dice`, `movableTokenIds`, `consecutiveSixes`, `winners`, and `lastAction`.
- **Players**: Each player has an `id`, `name`, `color`, `status`, and 4 `tokens`.
- **Tokens**: Tokens have a single `progress` integer representing their position. `-1` is the yard, `0-50` is the common track, `51-55` is the home lane, and `56` is finished.
- **Idempotency/Syncing**: The state relies on an `expectedRevision` model. The client sends the revision it knows, and if it's stale, the server rejects the action and forces a re-sync.

## 4. WebSocket Flow

Real-time communication is managed via Socket.IO, defined in `shared/src/protocol.ts`.

- **Client to Server**: Actions like `room:create`, `room:join`, `room:ready`, `game:roll`, `game:move`, `chat:send`, `room:react`.
- **Server to Client**:
  - `room:snapshot`: Broadcasts the complete `RoomSnapshot` (including `GameState`) to all clients whenever the state mutates.
  - `chat:message`: Broadcasts incoming chat messages.
  - `room:reaction`: Broadcasts emoji reactions.
  - `server:error`: Delivers error alerts.
- **Validation**: All payloads are strictly validated using Zod schemas on both ends.

## 5. Rendering Pipeline

The game board is rendered using CSS Grid and absolute positioning.

- **Board Background**: The physical path of the board is visually represented by a CSS grid (`board-cell`) mapped over a 15x15 layout, with `star-cell` and `safe-cell` modifiers.
- **Token Positioning**: Tokens are overlaid using `position: absolute`. Their coordinates are mapped using an array of hardcoded coordinate objects (`YARD_CIRCLE_COORDS`, `cellCoords`) to align with the visual board cells.
- **Responsiveness**: The board uses a `board-shell` with `transform: rotate` to orient the current player's home yard to the bottom of the screen.

## 6. Audio Engine

Currently, audio is implemented using a raw, inline Web Audio API implementation inside `App.tsx` (`playSound` function).

- **Current Implementation**: Generates synthesized tones using oscillators (`sine`, `triangle`, `square`) for `dice`, `move`, `capture`, `win`, `turn`, `click`, etc.
- **Drawbacks**: There is no central AudioEngine, volume control, preloading, or overlap prevention. Sound is fired imperatively inline.

*Recommendation for Audio Phase*: An `AudioEngine` singleton should be created to manage HTML5 Audio/Web Audio nodes with channels, volume sliders, and asset preloading.

## 7. Assets

- **Images**: Tokens (`token-red.png`, `token-blue.png`, etc.), avatars (`avatar1.png`, `bot-avatar.png`), and some background assets (like `ludo-board.svg` if applicable).
- **SVGs**: Inline SVG code used for icons, dice faces, and UI elements.
- **Missing**: We lack dedicated sprite sheets for particles, premium high-res emojis, or physical sound `.mp3` files (which explains the reliance on Web Audio synthesis).

## 8. CSS & Theming

Styling is handled via `styles.css` and `index.css`.

- **Variables**: Basic CSS custom properties exist for core colors (`--red`, `--blue`, `--green`, `--yellow`, `--board-bg`).
- **Structure**: It is a single monolithic CSS file. Responsive design is handled via standard media queries, shifting from a side-by-side desktop view to a stacked mobile view.

*Recommendation for UI Architecture Phase*: Tokenize the design system. Implement CSS modules or structured SCSS/Tailwind to manage z-indexes, standardized border-radii, and shadow depths.

## 9. Animations

Animations are currently a mix of CSS transitions and keyframes.

- **CSS Transitions**: Used for token movement (`transition: transform 0.3s ease-in-out`).
- **Keyframes**: Used for dice rolling (`diceRollJump`, `diceFloat`), active player highlighting (`borderGlow`), token hopping (`tokenMultiHop`), and capture board shaking (`cameraPunch`).
- **Control**: Animations are triggered by React state changes (e.g., `tokenAnimation` ID, `boardShake` boolean) appending CSS classes to elements for a specific duration via `setTimeout`.

*Recommendation for Animation Engine Phase*: A central `AnimationManager` or timeline helper (like GSAP or Framer Motion) is needed for complex, multi-stage sequences (like a token moving 6 spaces and bouncing precisely on each individual cell before landing).

---

## Conclusion & Readiness

The underlying game state, Zod schemas, and WebSocket networking are extremely robust, deterministic, and well-designed. The primary bottlenecks for scaling into a "Premium" game are:
1. The monolithic `App.tsx` file.
2. The lack of a centralized, decoupled Animation and Audio engine.
3. The reliance on purely CSS-based transitions for complex multi-step token paths.

The project is fully ready to proceed to **Phase 1: UI Architecture**.
