---
title: Footwork
emoji: 👟
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 6.29.1
python_version: "3.12.12"
app_file: app.py
pinned: false
---

# Footwork arrangement service

This directory contains the Hugging Face Space used by Footwork.

`/arrange` validates an anonymous movement-event timeline and asks the pinned
`google/gemma-4-E2B-it` checkpoint for one JSON arrangement. It accepts a result
only when:

- the mood is supported;
- the style uses the allowed instrumental vocabulary;
- every `event_refs` value exists in the submitted timeline; and
- the response matches the arrangement schema.

An invalid response stays invalid. This service does not invent a replacement
plan and does not call Eleven Music.

## Deployment

The Space uses ZeroGPU. Add `HF_TOKEN` as a Space secret so the pinned checkpoint
can be downloaded. Never place token values in source files.

Push these files to the Space repository:

- `app.py`
- `arrange.py`
- `gemma_runtime.py`
- `requirements.txt`
- `README.md`

The application service calls this Space first. Only a validated arrangement is
eligible to be sent to Eleven Music.

## Local checks

The arrangement schema and invalid-response behavior are covered by the backend
and Space tests. The public integration example is documented in
[`Docs/evidence/gemma-access.md`](../Docs/evidence/gemma-access.md).
