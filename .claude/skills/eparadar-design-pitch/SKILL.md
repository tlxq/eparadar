---
name: eparadar-design-pitch
description: How UI/visual decisions get made for eparadar - ask taste questions, then pitch a rendered Artifact before writing app code. Use whenever a screen, component, or visual direction is being designed, not just implemented from a spec.
---

# eparadar-design-pitch

For any eparadar visual/design decision, the user wants to be treated like a client of a modern
UX/UI designer, not handed a unilateral color/layout choice already baked into code.

## Steps

1. **Ask 3-4 concrete taste questions** — mood, color, type personality, light/dark emphasis —
   framed as named options with short rationale each. Not open-ended ("what do you want?").
2. **Publish a rendered Artifact** showing the actual decision applied to real content before
   writing anything into the app: actual color swatches, a WCAG contrast ledger, a type specimen
   using real Swedish app copy, component mockups in context. Hex codes in a text table are not
   sufficient — seeing it rendered is what lets fast, confident approval happen.
3. **Only implement into the codebase after that's approved.**

## Reuse existing tokens

Don't re-derive a palette per screen. Existing design tokens (dark-first, electric blue
`#2F6FED`, Inter, WCAG AA) live in `packages/theme` — pull from there for any new screen (map UI,
meetup cards, profile customization) unless the taste questions in step 1 specifically surface a
reason to deviate.
