# Product concept

> **Every walk writes a song.**

Footwork turns the shape and rhythm of a real walk into a short instrumental
piece. The result is a **Soundprint**: music, a simplified route, and a visual
timeline that explains how movement changed the arrangement.

## The problem

Fitness apps are good at totals, but they often lose the character of a journey.
Music generators can make a track from text, but that track is usually unrelated
to what a person physically did.

Footwork connects the two. The walk becomes the source material.

## Who it is for

Footwork is for walkers, runners, travellers, students, and creative-technology
users who want a memorable artifact from an ordinary journey. No music knowledge
is required.

## The experience

The person opens Footwork on a phone, records a walk, and ends it when ready.
Footwork cleans the route, finds meaningful moments, and builds an anonymous
movement timeline. Gemma interprets that timeline as a musical arrangement, and
Eleven Music renders the validated plan.

The Soundprint then shows how the route and music relate. A turn may redirect the
melody, a pause may create space, a faster section may add energy, and a loop may
bring back an earlier idea.

## Why it is different

- The music follows real movement rather than a generic text prompt.
- The result explains its own movement-to-music mapping.
- The visual recap and audio stay synchronized.
- A deterministic Route Sketch preserves the idea when live generation fails.
- The interface avoids health claims, competition, and fitness scoring.

## Product principles

- **Movement first:** the route must affect the structure of the result.
- **Easy to understand:** explanations use everyday language.
- **Honest output:** examples, planned mappings, sketches, and reviewed studio
  tracks are labeled differently.
- **Graceful failure:** provider problems should still leave a meaningful result.
- **Small scope:** one strong journey is more important than a large settings
  panel.
- **Respectful handling:** providers receive derived events rather than raw
  coordinates.

## System roles

- **Browser:** records the walk and presents the Soundprint.
- **Python:** cleans movement, detects events, validates plans, and controls the
  generation workflow.
- **Gemma:** acts as the musical director for the anonymous event timeline.
- **Eleven Music:** renders the validated instrumental arrangement.
- **Render:** serves the public web application and API.

## What is not included

The current product does not include accounts, social feeds, leaderboards,
public route galleries, health advice, lyrics, live music during the walk, route
planning, or guaranteed screen-off recording.

See [HANDOFF_2.md](HANDOFF_2.md) for the implemented experience and
[architecture.md](architecture.md) for the technical flow.
