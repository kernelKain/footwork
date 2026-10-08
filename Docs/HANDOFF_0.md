# Prompt 0 → Prompt 1 Idea Packet (Updated)

> **Amendment (October 8, 2026):** Phase 0 also sets up CodeRabbit for code review, Entire for agent-session sharing, DevRelay for DEV write-ups, GitHub Actions for automated checks, and Excalidraw for architecture diagrams. Locked detail is in `Docs/HANDOFF_1.md`. These are development tools, not product APIs, and they do not count toward the two-external-API limit.

**Project:** Footwork
**Thesis:** Transform a real movement trace into a short instrumental composition and a synchronized Soundprint whose musical events are causally derived from turns, pace changes, pauses, loops, elevation, and return behavior.
**Why:** Activity trackers preserve statistics but lose the emotional and structural character of a journey.
**Hook:** The animated route reaches a sharp turn exactly as the melody changes direction. A pause then visibly and audibly becomes a musical break.

---

## 1. Hackathon Facts

| Field | Value |
|---|---|
| Hackathon | Hacktoberfest Open-Source AI Challenge: Week 1, October 5–11, 2026 |
| Audience | DEV and sponsor judges |
| Judging criteria | Writing Quality; Prompt and Theme Relevance; Creativity; Technical Execution; meaningful Partner Technology use |
| Organizer tech | Open-source AI must be central. Gemma interprets an anonymized movement timeline into a constrained musical arrangement. |
| Target prize | **Primary:** Best Use of Gemma ($200 category). **Secondary:** Best Use of ElevenLabs and Best Use of Render. |
| Deadline | October 11, 2026 at 11:59 PM PDT (October 12, 2026 at 12:29 PM IST) |
| Available hours | Originally 24 fixed build hours across October 6–9, followed by polish, write-up, demo, testing, and emergency debugging. Prompt 1 must confirm the hours remaining. |

## 2. Builder Constraints

| Area | Constraint |
|---|---|
| Backend preference | Python must perform a major backend role. Java or Go may be added only when genuinely beneficial. |
| Coding mode | AI-assisted coding with process oversight rather than line-by-line manual review |
| Coding tool/model | Cursor with Grok 4.7 High as the primary builder; OpenCode Go with model TBD when useful; Kiro IDE with Claude and GPT frontier models for planning and debugging |
| Frontend ability | Basic React/Vite, supported by AI-assisted implementation |
| External API limit | Maximum of two. ElevenLabs is the sole essential external API category. Any map or elevation dependency must fit within the remaining allowance or use fixtures/local data. |

### Delivery Priority

1. Begin with the frontend and load complete, realistic demonstration data so the full experience can be seen and evaluated immediately.
2. Keep the initial backend minimal. Early work should maximize the visible product experience rather than prematurely implementing internal systems.
3. Expect frontend revisions after the first complete visual experience is reviewed. UI structure and styling must remain inexpensive to change.
4. In later work, shift the main focus to real movement processing, sponsor integrations, internal correctness, output quality, and refinement.
5. Reserve final work for the demo, submission write-up, README, testing, reliability checks, and only necessary debugging.

### Stage Priorities

| Stage | Primary concerns |
|---|---|
| Early | UI/UX quality, user experience, mobile presentation, visual storytelling, and the website's first impression |
| Later | Route analysis, music generation, synchronization, validation, privacy, fallback behavior, and output refinement |
| Final | Demo reliability, writing quality, documentation, testing, fixture-backed recovery, and submission readiness, which take precedence over new features |

## 3. Approved Product Definition

| Field | Definition |
|---|---|
| Target user | A casual walker or runner finishing a personally meaningful outing and wanting something more expressive and shareable than fitness statistics |
| Trigger | The user selects a positive musical mood, records or supplies a genuine walk, and ends the journey |
| Input | Timestamped movement samples, available elevation data, route duration, and selected mood |
| Core mechanism | Python cleans and anonymizes movement, detects meaningful spatial events, compresses the journey into chronological chapters, and builds a route-to-music timeline. Gemma converts that timeline into a constrained arrangement plan. Python validates the plan and converts it into a route-timed Eleven Music request. The resulting audio, abstract route, graph, and explanations share one synchronization map. |
| Visible output | A 45–60 second Studio Track with an animated privacy-safe route, a synchronized Route–Sound Graph, and a concise Movement Story |
| Current workaround | Route screenshots, fitness summaries, unrelated playlist songs, or generic AI-generated music. None preserves a causal relationship between movement and composition. |
| Sponsor role | Gemma is the open-weight musical director. ElevenLabs renders the polished instrumental Studio Track. Render is the preferred provisional public deployment target. |
| Non-wrapper moat | GPS cleaning, spatial-event detection, chronological compression, constrained planning, schema validation, audio-quality checks, privacy transformation, and cross-modal synchronization cannot be reproduced by a general conversational prompt. |
| Visual signature | A glowing route performs alongside its own music. Turns, speed changes, pauses, and loops trigger synchronized musical events. |
| Judge fit | Direct "Touch Grass" relevance; memorable creativity; visible backend computation; open-weight AI at the core; meaningful sponsor participation; strong write-up story |

### 60-Second Story

1. Show a real outdoor walk, open its Soundprint, and press Play.
2. Demonstrate a turn changing the melody, faster movement increasing intensity, a pause becoming a breakdown, and a loop beginning the chorus.
3. Scrub one marker to move the route, graph, and audio together.
4. Reveal Gemma's validated arrangement and ElevenLabs' Studio Track, and play a brief prepared Style Remix.
5. Close on the privacy-safe share card and the claim:

> "Footwork does not soundtrack your walk. Your walk writes the soundtrack."

### Must-Be-True Claim

Given a real movement trace containing meaningful turns, pace changes, pauses, or loops, produce a pleasant 45–60 second instrumental Soundprint whose synchronized markers make at least three movement-to-music relationships perceptible under normal GPS quality and an available music-generation service.

## 4. Frontend-First Prototype Contract

| Element | Requirement |
|---|---|
| Purpose | Make the complete experience visible before committing substantial time to backend implementation. |
| Demo data | A realistic completed walk containing turns, speed changes, a pause, a loop, route chapters, musical markers, a Movement Story, generation status, a privacy-safe route, and prepared audio. |
| Initial backend | Only the minimum needed to serve the frontend or load fixtures. Real inference, route analysis, persistence, retries, and external integrations may remain simulated. |
| Required fidelity | The prototype must behave like the intended product: synchronized playback, scrubbing, route animation, graph movement, responsive mobile layouts, loading states, success states, and understandable sponsor attribution. |
| Change tolerance | Visual hierarchy, layout, interactions, copy, colour, animation, and information density must remain easy to revise after review. |
| Replacement rule | Demo-data interfaces must define stable contracts that later backend work can satisfy without rebuilding the accepted frontend experience. |
| Honesty rule | Simulated or fixture-backed behavior must be clearly distinguished internally and never represented as a completed live integration. |

## 5. Scope Guidance

- **Essential capability:** First prove the complete Soundprint experience with realistic demo data. Then connect one genuine movement trace, detect four event types (turn, pace change, pause, and loop), and produce one short instrumental Soundprint with synchronized route and graph markers.
- **Optional capability:** Pocket Mode browser recording, three moods, elevation mapping, public links, downloads, one prepared Style Remix, longer-walk compression, retry handling, and richer Movement Stories.
- **Explicit exclusions:** Native applications, guaranteed screen-off tracking, accounts, social feeds, public galleries, live music during the walk, lyrics, unlimited remixing, route planning, health analytics, model training, and production-grade privacy guarantees.
- **Conceptual fallback:** Use the same extracted event timeline to generate a deterministic MIDI/open-synth Route Sketch with exact synchronization. The Route Sketch proves causality even if Gemma or ElevenLabs fails, while cached sponsor outputs preserve the polished demo.

## 6. Questions Prompt 1 Must Investigate

### Product Assumptions

- Users value and may share an expressive journey artifact.
- Movement-to-music mappings feel intentional.
- One mood can prove the concept.
- Judges understand the Hook within ten seconds.
- The frontend communicates the causal mapping without requiring technical narration.

### Technical Assumptions

- Eleven Music supports sufficient section and timing control.
- A suitable Gemma checkpoint returns reliable structured plans within accessible compute limits.
- Mobile-browser GPS capture is adequate.
- Chronological compression preserves meaningful events.
- Synchronized playback remains stable.

### Frontend Questions

- Which visual direction creates the strongest first impression?
- How do the route, graph, player, and explanations fit on mobile?
- Which interactions are essential?
- How do demo fixtures become stable backend contracts?
- How is the accepted experience kept easy to revise?

### Access Risks

- Eleven Music API access, credit availability, output rights, latency, and control behavior are unverified.
- Render's ability to host the selected Gemma checkpoint is unverified.
- Mobile Wake Lock and background-location behavior vary by device and browser.

### Claims to Validate

- The Studio Track audibly reflects route events.
- At least three mappings are judge-perceptible.
- Audio passes quality checks.
- Route sanitization materially reduces but cannot guarantee elimination of reidentification risk.
- Screen-off browser tracking is not guaranteed.

### Open Decisions

- Exact Gemma checkpoint
- Browser recording versus GPX/fixture import for the MVP
- Event thresholds
- Compression rules
- Music-plan format
- Frontend visual direction
- Visualization library
- Fixture contracts
- Storage
- Deployment topology
- Retry policy
- Whether Render is essential or only a prize-track host

### Planning Requirement

Prompt 1 must translate the approved delivery priority into detailed phases while protecting sufficient final time for the demo, write-up, README, testing, and debugging.

## 7. Idea History

| Item | Detail |
|---|---|
| Rejected directions | Earlier alternatives (LitterDelta, BedBeacon, DetourLens, FlockWindow, and FieldRelay) were not selected. No explicit rejection reasons were provided. Footwork replaced them with a stronger creative and shareable signature. |
| Selection reason | Footwork combines an instantly understandable audiovisual reveal with genuine Python data-processing depth, essential open-weight AI, visible sponsor technology, and a story naturally suited to the writing-heavy judging rubric. |

## 8. Boundary for Prompt 1

Backend language preference and required organizer technology are inputs, not a complete locked stack. Prompt 1 owns architecture, detailed stack, UI specification, deployment, implementation scope, risk analysis, and phase planning.

Prompt 1 must preserve the frontend-first instruction: establish the complete fixture-backed user experience and first impression before expanding the real backend. Later phases should replace fixtures through stable contracts, focus on internal correctness and output quality, and protect the final submission period from unnecessary feature work.
