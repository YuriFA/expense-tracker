---
version: "superdesign-alpha"
name: "Split auth aurora"
description: "A near-white split-screen authentication system: a flat neutral form panel on the left paired with a full-bleed multi-hue mesh gradient canvas on the right holding a single floating glass prompt bar."
colors:
  background: "#F0F0F0"
  surface: "#FAFAFA"
  text-primary: "#030303"
  text-secondary: "#636363"
  border: "#D2D2D2"
  accent: "#1F68DB"
  gradient-blue: "#7890F0"
  gradient-lilac: "#D8D8F0"
  gradient-cyan: "#D8F0F0"
  gradient-coral: "#FF4848"
typography:
  display-lg:
    fontFamily: "Camera Plain Variable"
    fontSize: "30px"
    fontWeight: 480
    lineHeight: "1.5"
  body-md:
    fontFamily: "Camera Plain Variable"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.5"
  label-mono:
    fontFamily: "Camera Plain Variable"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.5"
spacing:
  base: "8px"
  gap: "16px"
  section-padding: "80px"
rounded:
  control: "9999px"
  card: "12px"
  field: "12px"
components:
  button-primary:
    background: "rgba(0, 0, 0, 0.88)"
    text-color: "#FAFAFA"
    radius: "9999px"
    height: "44px"
    padding: "10px 14px"
  button-oauth:
    background: "transparent"
    text-color: "#030303"
    radius: "9999px"
    height: "44px"
    padding: "10px 14px"
    border: "1px solid #D2D2D2"
  prompt-bar-glass:
    background: "#E1E1E0"
    text-color: "#030303"
    radius: "16px"
    height: "56px"
  prompt-submit-fab:
    background: "rgba(0, 0, 0, 0.88)"
    text-color: "#FAFAFA"
    radius: "9999px"
    height: "40px"
---
# Split auth aurora

Source: https://preview--web-workstation-studio.lovable.app/

## Overview
This is a minimalist, content-first authentication screen built on a strict two-pane split: a flat, near-white utility panel carrying the form, and a full-bleed gradient canvas carrying a single interactive artifact. The dominant field is neutral gray-white — the system is otherwise colorless by design — so the entire emotional register of the page is delivered by one rationed, saturated gradient plane confined to the right half. Typography is a single variable sans (Camera Plain Variable) doing all jobs: heading, body, label. The aesthetic reads as Swiss-adjacent restraint on the left married to an aurora-gradient marketing surface on the right, a pairing common to modern AI/dev-tool product pages.

## Composition
Left pane: a small gradient-filled logomark, a short display heading, three stacked OAuth buttons, an "OR" rule-divider, a labeled email field, a full-width solid CTA, a helper link line, and a fine-print SSO note — all left-aligned in a narrow fixed-width column with generous top offset. Right pane: one full-bleed gradient canvas with a single centered-low glass input bar floating on it, nothing else. The deliberate choice is asymmetry of density — one side is form-dense and monochrome, the other is empty except for one glowing artifact — rejecting a symmetrical two-column form-plus-illustration layout in favor of maximal contrast between "utility" and "atmosphere."

## Colors
`#F0F0F0` is the page/panel background, ~81% of pixels — the system's true neutral field, not white. Text ink is near-black (`#030303`/`#000000`) on that field with `#636363` as the secondary/muted tone. `#D2D2D2` borders the OAuth buttons and the email field at hairline weight. The primary CTA is not brand-colored but a near-black fill `rgba(0, 0, 0, 0.88)` with off-white `#FAFAFA` text — the system treats "ink-solid" as its highest-emphasis surface. The only saturation lives in the right-pane gradient: `#7890F0` blue, `#D8D8F0` lilac, `#D8F0F0` cyan, and `#FF4848` coral each register at 2–3% of total page pixels, plus a declared brand blue `#1F68DB` seen at just 0.1% (the logomark's tightest accent). Color is entirely rationed to the canvas plane; the form panel is deliberately left achromatic.

## Typography
One family, Camera Plain Variable, carries every role at variable weight rather than swapping fonts. The heading token sits at 30px/480 weight, line-height 1.5 — a soft, not-bold display treatment, closer to a section label than a hero headline. Body and controls sit at 16px/400, lh 1.5, in `#030303` with secondary copy dropping to `#636363`. A smaller ~13px instance of the same family serves the "OR" divider and fine-print roles, in uppercase-tracked or reduced-emphasis form. No serif or mono accent appears; the single-family discipline is itself the typographic signature.

## Layout
No visible column grid governs the left panel — it is a fixed-width vertical stack (roughly 285px content column) with consistent 16px/8px rhythm between stacked elements and 80px-scale offsets for section separation from the viewport edge. The right pane is a single full-bleed cell, edge-to-edge, no margin — a two-item grid where item widths split 50/50 across the viewport (per the measured 2-column, 2-item, [50/50] grid), confirming the page's outer structure is exactly a two-pane split, not a contained/centered composition. Two secondary 1-column/2-row [100|100] stacks describe the internal OAuth-button and helper-text groupings on the left — simple vertical lists, gap 16px, no side-by-side cards anywhere in this view.

## Components
- **Logomark**: top-left of the form panel, one instance, ~40px square, a soft heart/droplet glyph rendered in the same coral-to-blue-to-violet gradient family as the right pane — the only chromatic note inside the neutral panel.
- **OAuth button (×3, stacked)**: appear directly under the heading, one per identity provider, full-width of the form column, arranged in a vertical list with 16px gaps. Surface: `transparent` fill, `1px solid #D2D2D2` border, `9999px` full-pill radius, 44px height, `10px 14px` padding. Anatomy: a monochrome glyph icon left-aligned, provider label centered/left in `#030303` text, no chip or trailing element.
- **Divider row**: a single hairline rule interrupted by a small centered uppercase label, separating OAuth stack from the email field group.
- **Email field**: one instance, label above input. Input surface is a light `#FAFAFA`/`#F0F0EF`-toned rectangle with `6px`-radius corners and a `#D2D2D2` border, placeholder text in secondary gray.
- **Primary CTA button**: one instance, full width of the form column, directly under the email field. Surface: `rgba(0, 0, 0, 0.88)` fill, `#FAFAFA` text, `9999px` pill radius, 44px height, `10px 14px` padding — the highest-contrast control on the page and the page's true primary action.
- **Helper link line**: centered small text beneath the CTA pairing muted copy with an underlined link in the same ink tone — no color distinguishes the link beyond the underline.
- **Fine-print/SSO row**: bottom of the panel, a small lock glyph plus muted caption text with one underlined inline link, separated from the block above by a thin divider.
- **Floating prompt bar (glass)**: one instance, positioned low-center on the gradient canvas, not touching any edge. Surface: light warm-gray glass fill (`#E1E1E0`-family) with `16px` radius, ~56px height, containing left-aligned placeholder copy in `#030303` and a text cursor. 
- **Submit FAB**: nested inside/beside the prompt bar's right edge, a small circular `rgba(0, 0, 0, 0.88)` fill button, `9999px` radius, ~40px, carrying a single upward-arrow glyph in `#FAFAFA` — the canvas's only interactive control besides the bar itself.

## Graphics & Effects
The right pane is a full-bleed mesh/aurora gradient canvas — soft blended blobs of white-gray, blue (`#7890F0`), lilac (`#D8D8F0`), cyan (`#D8F0F0`) transitioning into a coral/orange base (`#FF4848` family) toward the bottom edge, covering the entire right half of the viewport (roughly 50% of total page area) as a continuous atmospheric backdrop, not a small decorative patch. Two subtle linear gradients are layered as fine scrims elsewhere in the system: `linear-gradient(rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0))` and `linear-gradient(in srgb, rgba(0, 0, 0, 0), oklch(0 0 0 / 0.88))` — both near-transparent-to-near-black washes used for top/bottom edge legibility rather than as visible color. The floating prompt bar carries an inset ring shadow `oklch(0 0 0 / 0.25) 0px 0px 0px 1px inset` for glass-edge definition, plus a compound elevation shadow (`rgba(0,0,0,0.04) 0px 2px 2px -1px inset, rgba(0,0,0,0.02) 0px 4px 4px -2px inset, rgb(255,255,255) 0px 1px 0px 0px, oklch(0.6132 0.2106 264.41 / 0.4) 0px 0px 0px 1px inset`) giving it a lit top-edge highlight against the gradient. Form-panel controls carry a lighter twin-layer drop shadow (`color(srgb 0.0860868 0.0861112 0.0861135 / 0.12) 0px 2px 2px -1px, ... 0px 4px 4px -2px`) for a barely-lifted card feel on buttons and the input.

## Motion
Interactions are fast and understated: opacity changes run at `0.15s cubic-bezier(0.4, 0, 0.2, 1)` for hover/focus fades, while transform-based movement (scale/translate/rotate) runs slower at `0.3s cubic-bezier(0.4, 0, 0.2, 1)` for button presses and control shifts. Named keyframe sets (heartbeat, heart-shimmer-sweep, gradient-sweep, message-highlight, animate-blink, shake) point to a small library of micro-interaction accents — a shimmer sweep across the gradient logomark or prompt bar, a blinking cursor in the input, and a shake for validation error — all quick, single-purpose, and never looping indefinitely except the blink.

## Guardrails
- Never recolor the left form panel — it stays achromatic (`#F0F0F0`/`#FAFAFA`/`#030303`/`#636363`); all saturation belongs exclusively to the right-pane canvas.
- Never shrink the right-pane gradient into a corner accent or hero-strip — it is a full-bleed 50%-width canvas, edge-to-edge top to bottom.
- Never give OAuth buttons a filled background — they stay `transparent` with a `#D2D2D2` hairline border; only the email-flow CTA and the canvas FAB get solid near-black fills.
- Never sharpen the pill controls — every button and the logo capsule use `9999px` full-pill radius, not the 12px card radius.
- Never replace the single Camera Plain Variable family with a second display or serif face; hierarchy comes from size/weight variation only.
- Keep the floating prompt bar detached and low-center on its canvas — it is not a top-anchored search bar and not edge-docked.