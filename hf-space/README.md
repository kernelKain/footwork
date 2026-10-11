# Footwork arrangement service

This directory is the Hugging Face Space at `kernelKain/footwork`.

`/arrange` checks an anonymous event timeline, then asks `google/gemma-4-E2B-it` at revision `3e22461f65e89153144f8adb70e3b8c2cc9845a7` for one JSON plan. Thinking is off. A reply is accepted only when `mood` is `warm_cinematic`, `style` is one to six words from the closed instrumental list and includes `instrumental`, and every `event_refs` id is in the timeline. Anything else stays a blocked or invalid result. This service does not invent a plan, and it does not call Eleven Music.

The Space runtime is free ZeroGPU (`zero-a10g`). The `spaces` package is provided there. When the app starts it downloads the checkpoint and places it on CUDA, which is the placement ZeroGPU keeps. Set `HF_TOKEN` as a Space secret so that download is authenticated. The first start after a push can take several minutes. A request does not download the weights.

Push `app.py`, `arrange.py`, `gemma_runtime.py`, `requirements.txt`, and this file to the Space repository. Do not put a token in these files.
