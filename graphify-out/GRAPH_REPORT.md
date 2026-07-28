# Graph Report - client  (2026-07-28)

## Corpus Check
- Corpus is ~7,442 words - fits in a single context window. You may not need a graph.

## Summary
- 117 nodes · 192 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.8)
- Token cost: 1,250 input · 1,024 output

## Community Hubs (Navigation)
- Game UI Components
- Package Dependencies
- TypeScript Config
- Landing & Constants
- Board & Audio
- Package Metadata
- Visual Assets & Preview
- App Shell & Error Handling
- Dice Face SVGs

## God Nodes (most connected - your core abstractions)
1. `tr()` - 11 edges
2. `LudoBoard()` - 6 edges
3. `Room()` - 6 edges
4. `playSound()` - 6 edges
5. `Dice Artwork Preview Page` - 6 edges
6. `Ludo Board Game Layout` - 6 edges
7. `Classic Ludo Dice Concept` - 6 edges
8. `Glossy Plastic Dice Concept` - 6 edges
9. `Soft Toy Dice Concept` - 6 edges
10. `Minimal Premium Dice Concept` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Apna Ludo Main Entry Point` --conceptually_related_to--> `Ludo Board Game Layout`  [INFERRED]
  client/index.html → client/public/board.png
- `Apna Ludo Main Entry Point` --conceptually_related_to--> `Dice Artwork Preview Page`  [INFERRED]
  client/index.html → client/public/dice-preview.html
- `Dice Artwork Preview Page` --references--> `Classic Ludo Dice Concept`  [EXTRACTED]
  client/public/dice-preview.html → client/public/assets/dice/concept-a.svg
- `Dice Artwork Preview Page` --references--> `Glossy Plastic Dice Concept`  [EXTRACTED]
  client/public/dice-preview.html → client/public/assets/dice/concept-b.svg
- `Dice Artwork Preview Page` --references--> `Soft Toy Dice Concept`  [EXTRACTED]
  client/public/dice-preview.html → client/public/assets/dice/concept-c.svg

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dice Design Concept Alternatives for Ludo Game** — client_public_assets_dice_concept_a_svg, client_public_assets_dice_concept_b_svg, client_public_assets_dice_concept_c_svg, client_public_assets_dice_concept_d_svg, client_public_assets_dice_concept_e_svg [INFERRED 0.90]
- **Ludo Game Visual Assets Collection** — client_public_board_png, client_public_assets_dice_concept_a_svg, client_public_assets_dice_concept_b_svg, client_public_assets_dice_concept_c_svg, client_public_assets_dice_concept_d_svg, client_public_assets_dice_concept_e_svg [INFERRED 0.85]
- **Dice Preview and Selection System** — client_public_dice_preview_html, client_public_assets_dice_concept_a_svg, client_public_assets_dice_concept_b_svg, client_public_assets_dice_concept_c_svg, client_public_assets_dice_concept_d_svg, client_public_assets_dice_concept_e_svg [INFERRED 0.85]
- **Ludo Dice Face Asset Set (1-6)** — client_public_assets_dice_dice_1_svg, client_public_assets_dice_dice_2_svg, client_public_assets_dice_dice_3_svg, client_public_assets_dice_dice_4_svg, client_public_assets_dice_dice_5_svg, client_public_assets_dice_dice_6_svg [EXTRACTED 1.00]

## Communities (11 total, 1 thin omitted)

### Community 0 - "Game UI Components"
Cohesion: 0.15
Nodes (16): ChatSidebar(), EmojiReactionSystem(), Die(), PlayerCorner(), PlayerRankItem(), PlayerSeat(), PlayerTurnIndicator(), Props (+8 more)

### Community 1 - "Package Dependencies"
Cohesion: 0.10
Nodes (21): @apna-ludo/shared, dependencies, @apna-ludo/shared, react, react-dom, react-router-dom, rolldown, socket.io-client (+13 more)

### Community 2 - "TypeScript Config"
Cohesion: 0.13
Nodes (14): src, src/**/*.spec.ts, src/**/*.test.ts, src/**/__tests__/**, ../tsconfig.base.json, vite.config.ts, compilerOptions, jsx (+6 more)

### Community 3 - "Landing & Constants"
Cohesion: 0.31
Nodes (7): Landing(), Logo(), MiniBoard(), AVATARS, COLOR_HEX, COLORS, ConnState

### Community 4 - "Board & Audio"
Cohesion: 0.33
Nodes (7): LudoBoard(), SAFE_CELLS_SET, STAR_CELLS_SET, tokenCellIndex(), getCtx(), playSound(), soundEnabled

### Community 5 - "Package Metadata"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, typecheck, type, version

### Community 6 - "Visual Assets & Preview"
Cohesion: 0.79
Nodes (8): Apna Ludo Main Entry Point, Classic Ludo Dice Concept, Glossy Plastic Dice Concept, Soft Toy Dice Concept, Minimal Premium Dice Concept, Realistic Dice Concept, Ludo Board Game Layout, Dice Artwork Preview Page

### Community 8 - "Dice Face SVGs"
Cohesion: 1.00
Nodes (6): Dice Face 1 (Single Pip), Dice Face 2 (Two Pips), Dice Face 3 (Three Pips), Dice Face 4 (Four Pips), Dice Face 5 (Five Pips), Dice Face 6 (Six Pips)

## Knowledge Gaps
- **31 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Package Dependencies` to `Package Metadata`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `tr()` connect `Game UI Components` to `Landing & Constants`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Game UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.1452991452991453 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._