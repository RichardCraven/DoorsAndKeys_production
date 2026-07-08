# Combat Effects Documentation

## Overview
This document catalogs visual and gameplay effects applied to combatants during battle, including overlays, pseudo-elements, and CSS animations.

---

## Drained Effect

**Trigger:**
- Applied when a fighter is hit by an energy drain attack (e.g., from the Mummy).

**Visual:**
- Adds the `.drained` class to the `.fighter-portrait` element.
- Renders a pseudo-element (`::before`) above the portrait, currently as a solid oval with ⚡ symbols.

**CSS:**
- See `.fighter-portrait.drained::before` in `monster-battle.scss`.

**Planned Tweak:**
- Change from a solid oval to a hollow circle for improved visual clarity.

---

## Other Effects

(Add documentation for other combat effects here as needed.)
