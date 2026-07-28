# UI Component Tree Architecture

This document defines the strict React component hierarchy for Phase 1. 

By splitting `App.tsx` into these discrete components, we enforce single-responsibility, reduce unnecessary re-renders, and make animations/theming much easier to manage.

## Directory Structure

```text
client/src/
  ├── App.tsx (Main Router & Auth Provider only)
  ├── components/
  │    ├── layout/
  │    ├── game/
  │    ├── ui/
  │    ├── chat/
  │    └── modals/
  ├── hooks/
  └── utils/
```

## Component Hierarchy

### 1. Layout Components (`components/layout/`)

```text
<GameLayout>
  ├── <Header>
  │    ├── <RoomCodeBadge />
  │    └── <HeaderActions> (Settings, Chat toggle)
  │
  ├── <Sidebar> (Desktop only)
  │
  └── <MainArea>
```

### 2. Game Components (`components/game/`)

```text
<GameScreen> (Subscribes to GameState)
  ├── <PlayerCardList>
  │    └── <PlayerCard> (Renders 2-4 times)
  │         ├── <Avatar />
  │         ├── <ConnectionIndicator />
  │         ├── <DiceContainer>
  │         │    └── <Dice /> (Includes 3D model/CSS animations)
  │         └── <StatsBadge />
  │
  ├── <BoardContainer>
  │    └── <LudoBoard>
  │         ├── <BoardGrid> (SVG or CSS Grid background)
  │         ├── <SafeCells>
  │         ├── <HomeYards> (4 instances)
  │         │    └── <YardHighlight /> (Active turn indicator)
  │         └── <TokenLayer>
  │              └── <Token> (16 instances, positioned absolutely)
  │                   └── <TokenShadow />
```

### 3. Chat & Social Components (`components/chat/`)

```text
<ChatSidebar>
  ├── <ChatMessagesList>
  │    └── <ChatMessage>
  │
  ├── <ChatInput>
  │    ├── <QuickChatMenu />
  │    └── <TextInput />
  │
  └── <ReactionSystem>
       ├── <ReactionPicker> (Grid popup)
       └── <ReactionRenderer> (Floating emojis over screen)
```

### 4. Modals (`components/modals/`)

```text
<ModalLayer>
  ├── <SettingsModal>
  │    ├── <VolumeControl />
  │    └── <ThemeToggle />
  │
  └── <VictoryModal>
       ├── <ConfettiRenderer />
       ├── <RankingsList />
       └── <RematchControls />
```

### 5. Reusable UI Primitives (`components/ui/`)

These components have no game logic. They are purely presentational and use the Design System tokens.

```text
<Button> (Variants: Primary, Secondary, Ghost, Icon)
<Badge>
<Tooltip>
<Card>
<Dialog>
```

## State & Props Contract

- **`GameScreen`** is the smart container. It pulls `snapshot.game` from the global context/socket state.
- **`LudoBoard`** receives `game`, `myPlayerId`, `legalTokens`, and `onMove` as strict props. It should use `React.memo` to prevent re-renders unless these specific props change.
- **`Token`** receives `x`, `y`, `color`, `isLegal`, and `isAnimating`.
- **`Dice`** receives `value`, `isRolling`, and `isActive`. It manages its own internal rotation state.

---
**Prepared for Phase 1.**
