import fastapi
import httpx
import numpy
import pydantic
from app.main import app
from gradio_client import Client


def test_locked_packages_import() -> None:
    assert app.title == "Footwork"
    assert fastapi.__version__ == "0.143.0"
    assert pydantic.VERSION == "2.13.5"
    assert httpx.__version__ == "0.28.1"
    assert numpy.__version__
    assert Client is not None
