# Animation Specification & Behavior Guide

This document catalogs every animation required for the premium Ludo experience. It dictates the duration, easing curve, triggers, and associated sounds/particles for every interaction.

## Animation Philosophy

- **No animation should ever block gameplay.**
- **Animations enhance gameplay, never delay gameplay.**

---

## 1. Dice Animations

| State | CSS Animation Name | Duration | Easing Curve | Description | Sound Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Idle** | `diceFloat` | `2000ms` (Infinite) | `ease-in-out` | Smoothly floats up and down by `3px` to indicate it is interactable. | None |
| **Active Turn** | `diceGlowPulse`| `1500ms` (Infinite) | `alternate` | Golden aura `box-shadow` pulses around the dice container. | `turn.mp3` |
| **Rolling (Y)**| `diceRollJump` | `500ms` | `ease-out` | Dice jumps up `40px` and scales slightly (squash/stretch) with shadow scaling. | `dice.mp3` |
| **Rolling (Z)**| `diceRattle` | `100ms` (Infinite) | `linear` | Inner container rotates rapidly mimicking physical rolling. | (Loops during roll) |
| **Landing** | N/A (Transition)| `100ms` | `ease-in` | Slams down to Y:0, showing final result. | `land.mp3` |

---

## 2. Token Animations

| State | CSS Animation Name | Duration | Easing Curve | Description | Sound Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Selectable** | `tokenSelectBounce`| `1000ms` (Infinite) | `ease-in-out` | Token scales to `1.1x` and hops slightly with a white glowing drop-shadow. | None |
| **Moving (Hop)**| `tokenMultiHop` | `100ms` (Infinite) | `linear` | Token rapidly jumps up and down while CSS `transition` moves its X/Y coordinates across the board. | `step.mp3` |
| **Land (End)** | `tokenLandBounce` | `200ms` | `cubic-bezier` | Slight squash and stretch upon reaching the final destination cell. | `land.mp3` |
| **Capture Fly**| `tokenFlyHome` | `400ms` | `ease-in` | Token is sucked back into the yard with a shrinking scale effect. | `capture.mp3` |

---

## 3. Board & UI Animations

| State | CSS Animation Name | Duration | Easing Curve | Description | Sound Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Active Yard**| `borderGlow` | `1500ms` (Infinite) | `ease-in-out` | The active player's yard border pulses white/gold. | None |
| **Safe Cell** | `safeCellGlow` | `2000ms` (Infinite) | `alternate` | Star cells breathe softly to indicate safety. | None |
| **Board Shake**| `cameraPunch` | `300ms` | `cubic-bezier` | Container vigorously shakes left/right by `8px` when a capture occurs. | None |
| **Emoji Popup**| `popupOpen` | `200ms` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Emoji selector scales in with a slight overshoot bounce. | `pop.mp3` |
| **Emoji Float**| `floatUpFade` | `2500ms` | `ease-out` | Emoji rises from avatar, slows down, and fades out. | None |
| **Victory** | `fall` (Confetti)| `3000ms` (Infinite) | `linear` | Red/Gold particles rain from the top of the screen. | `win.mp3` |

---

## Technical Notes for Phase 2 (Animation Engine)

1. **CSS vs JS**: Simple infinite loops (`diceFloat`, `borderGlow`) remain in CSS. However, sequenced animations (Token moving from A to B across 6 cells) MUST be moved to a JavaScript timeline (like GSAP or a custom `AnimationManager`) to guarantee perfect synchronization with the audio engine (`step.mp3` on every tile).
2. **Performance**: All animations MUST use `transform` (`translate`, `scale`, `rotate`) or `opacity`. Never animate `top`, `left`, `width`, or `height` to prevent layout thrashing and maintain 60 FPS on mobile devices.
3. **Hardware Acceleration**: Apply `will-change: transform` dynamically during movement, and remove it when idle.
