"""ZeroGPU entrypoint.

`/arrange` accepts an anonymized event timeline and asks the pinned Gemma
checkpoint for one arrangement plan. A blocked or invalid result is not a plan.
"""

import json

import gradio as gr

from arrange import arrange
from gemma_runtime import complete_with_gemma, preload_gemma

preload_gemma()


def arrange_request(timeline_json: str) -> str:
    """Parse the submitted timeline JSON and return the arrangement result as JSON."""
    try:
        timeline = json.loads(timeline_json)
    except json.JSONDecodeError:
        timeline = None
    if not isinstance(timeline, dict):
        result = {
            "schema_version": "1",
            "status": "invalid",
            "code": "timeline_invalid",
            "arrangement": None,
            "fallback": "route_sketch",
            "message": "The timeline must be a JSON object. No arrangement was generated.",
        }
    else:
        result = arrange(timeline, complete=complete_with_gemma)
    return json.dumps(result)


with gr.Blocks(title="Footwork") as demo:
    gr.Markdown(
        "Gemma arrangement. A blocked or invalid response is not a musical plan."
    )
    timeline = gr.Textbox(label="Anonymous event timeline JSON", lines=8)
    result = gr.Textbox(label="Arrangement result", lines=8)
    submit = gr.Button("Arrange")
    submit.click(arrange_request, inputs=timeline, outputs=result, api_name="arrange")


if __name__ == "__main__":
    demo.launch()
