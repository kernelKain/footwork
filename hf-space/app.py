"""ZeroGPU entrypoint.

The arrangement function is added when Gemma access is proved.
This module must stay importable without downloading a model.
"""

import gradio as gr


def status() -> str:
    return "Gemma arrangement is not available in this build."


demo = gr.Interface(
    fn=status,
    inputs=None,
    outputs=gr.Textbox(label="Status"),
    title="Footwork",
    description="Arrangement proof has not run. This response is not a musical plan.",
)
