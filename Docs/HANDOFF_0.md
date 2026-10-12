# Initial product direction

This document keeps the useful starting decisions for Footwork. For the current
product, read [HANDOFF_2.md](HANDOFF_2.md).

## Goal

Build a mobile-first experience that turns a real walk into a short instrumental
piece and explains how movement affected the music.

The core idea is simple:

> The route is the score, and the walk is the performance.

## Product principles

- The walk must meaningfully change the result.
- A person should understand the idea without knowing music theory.
- Movement analysis and music generation should be separate steps.
- The interface should be useful even when an AI or music provider is offline.
- The product should describe generated, planned, and example audio honestly.
- Raw location data should not be sent to music or language-model providers.

## Original scope

The first complete version needed:

- A clear landing page and mobile recording flow
- Route cleaning and movement-event detection
- A structured arrangement from an open-weight model
- Instrumental music rendering
- A synchronized route, player, timeline, and explanation
- A deterministic fallback based on the same movement events

Accounts, social feeds, health analytics, public route galleries, lyrics, and
native background tracking were intentionally left out.

## Result

The implemented product follows this direction and adds pause/resume, themes,
accessible motion, share links, provider safeguards, and a more complete
Soundprint. Those details are summarized in [HANDOFF_2.md](HANDOFF_2.md).
