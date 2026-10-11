---
title: A walk writes the instrumental, then the Soundprint shows where
published: false
tags:
  - devchallenge
  - hf26challenge
ai_disclosure: some_ai
edit_url: https://dev.to/kernelkain/a-walk-writes-the-instrumental-then-the-soundprint-shows-where-c29-temp-slug-9075242/edit
---

# A walk writes the instrumental, then the Soundprint shows where

This draft is unpublished. Review it before it is posted. The backup video, screenshots, and architecture PNG are still to be added.

## The problem

A walk has a shape: a corner, a stop, a faster stretch. Most recordings of that walk throw the shape away and keep a track that could have been any song. Footwork keeps the shape and turns it into a short instrumental, then shows the same moments on the piece while it plays.

## The hook

Open the public app at https://footwork-m6g0.onrender.com/ and choose **Hear an example**. The piece is labeled Example walk. A turn sits near 0:18 and is meant to change the melody's direction. A pause sits near 0:36 and is meant to hold the sound. That example is prepared in the browser. It is not a live call to Gemma or Eleven Music.

## How movement becomes music

The phone keeps the walk locally. Ending it sends the trace to the API. The server cleans the trace and looks for a sharp turn, a pause, a pace change, and a return to an earlier part of the route. Coordinates and the original clock are removed before any model sees the walk. Gemma, `google/gemma-4-E2B-it` on a Hugging Face ZeroGPU Space, proposes a constrained instrumental arrangement from that anonymous timeline. A plan that validates is the only request sent to Eleven Music. The browser then plays one audio element, and the route, ribbon, and current moment follow that clock.

If the arrangement or the recording fails, the same timeline becomes a simpler Route Sketch on the server. The page says so.

## Why Gemma is central

Gemma is the musical director, not a caption model. It chooses the arrangement from the movement events. Render hosts the app and the API. Eleven Music renders the accepted plan. The development tools, including the agent that helped draft this explanation, are not part of that runtime.

## What was hard

The providers must not see the place. The quota has to stop a new piece before a paid call when the day's budget is gone. A lost music response must not be retried, because the request may already have been charged. The example, the Route Sketch, and a studio recording use different sentences so a listener can tell them apart.

## Limitations

The outdoor walk was reviewed, and the heard-time sheet for that studio file is not filled yet. Gemma latency for the checked plan was not measured. Eleven balance was not readable with the key in use. The demonstration video and screenshots are not attached to this draft.

## Links

- App: https://footwork-m6g0.onrender.com/
- Repository: https://github.com/kernelKain/footwork
- Architecture notes live in the repository at `Docs/architecture.md`
