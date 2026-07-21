import json

import numpy as np
import pytest

from app.simulation.multi_physics.visualization_hooks import EventSystem


@pytest.mark.unit
def test_event_encoder_serializes_numpy_scalars() -> None:
    event_system = EventSystem()
    payload = {
        "is_active": np.bool_(True),
        "iteration": np.int64(3),
        "temperature": np.float64(300.5),
    }

    encoded_payload = json.dumps(payload, cls=event_system.json_encoder)

    assert json.loads(encoded_payload) == {
        "is_active": True,
        "iteration": 3,
        "temperature": 300.5,
    }
