"""ZeroGPU entrypoint.

`/arrange` accepts an anonymized event timeline and returns a proof result.
A blocked result is not a musical arrangement.
"""

import json

import gradio as gr

from arrange import arrange


def arrange_request(timeline_json: str) -> str:
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
        result = arrange(timeline)
    return json.dumps(result)


with gr.Blocks(title="Footwork") as demo:
    gr.Markdown("Gemma arrangement proof. A blocked response is not a musical plan.")
    timeline = gr.Textbox(label="Anonymous event timeline JSON", lines=8)
    result = gr.Textbox(label="Proof result", lines=8)
    submit = gr.Button("Arrange")
    submit.click(arrange_request, inputs=timeline, outputs=result, api_name="arrange")
