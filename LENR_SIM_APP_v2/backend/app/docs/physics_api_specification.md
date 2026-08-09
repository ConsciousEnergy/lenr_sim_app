# Physics Simulation API Reference

## Purpose and scope

This document describes the mounted physics calculation and real-time simulation
interfaces in `backend/app/routers/physics_simulation_router.py` and
`backend/app/routers/websocket_router.py`.

These interfaces expose exploratory numerical models:

- WKB tunneling through Coulomb, screened Coulomb, or Woods-Saxon potentials.
- Fusion-rate estimates based on astrophysical S-factors.
- Proposed LENR enhancement mechanisms.
- A simplified acoustic-cavitation collapse model.

The LENR mechanisms and bubble-fusion estimates are theoretical and, in several
cases, scientifically disputed. Treat outputs as model results, not predictions
of experimentally validated reaction yields.

## Flow Visualization Attribution

The Unified Theory frontend visualization includes a phase-aware fluid-flow layer inspired by vortex particle flow-map methodology. The current implementation uses an internal approximation aligned to LENR bubble phases and API outputs, rather than a direct embedding of external solver code.

Reference materials:
- VPFM repository: <https://github.com/pfm-gatech/VPFM>
- VPFM paper (arXiv): <https://arxiv.org/pdf/2505.21946>

## Local access

From `LENR_SIM_APP_v2/backend`:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

| Interface | URL |
| --- | --- |
| REST base | `http://localhost:8010/api` |
| Swagger UI | `http://localhost:8010/api/docs` |
| ReDoc | `http://localhost:8010/api/redoc` |
| OpenAPI JSON | `http://localhost:8010/api/openapi.json` |
| WebSocket base | `ws://localhost:8010/api` |

The frontend REST and simulation WebSocket clients default to port `8000`.
`start_app.sh` starts the backend on port `8001`; when using that script, set
`REACT_APP_API_URL=http://localhost:8001` for REST requests. The development
simulation WebSocket client currently hard-codes port `8000`, so its streaming
interface still requires the backend on port `8000` or a corresponding frontend
code change.

## Architecture and routing

`app.main` mounts the calculation router directly at `/api/physics` and mounts
the WebSocket router with an `/api` prefix. REST calls are stateless: each
request performs a complete calculation and returns its result.

A separate, older physics router is mounted at `/api/physics/physics/*` because
it already declares its own `/physics` prefix. Its request and response models
are different. Use the paths in this document for the newer WKB, LENR, and
bubble-fusion interfaces used by the current visualization components.

## REST endpoint summary

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/physics/quantum-tunneling` | Calculate WKB tunneling and visualization curves |
| `GET` | `/api/physics/quantum-tunneling/defaults` | List tunneling defaults, options, and advisory limits |
| `POST` | `/api/physics/fusion-rate` | Estimate a fusion rate and power density |
| `GET` | `/api/physics/materials` | List material properties used by the models |
| `GET` | `/api/physics/reactions` | List reaction Q-values and S-factors |
| `POST` | `/api/physics/lenr-enhancement` | Calculate selected LENR enhancement factors |
| `GET` | `/api/physics/lenr-enhancement/mechanisms` | List enhancement mechanism identifiers |
| `POST` | `/api/physics/lenr-reaction-rate` | Estimate an enhanced D-D reaction rate |
| `POST` | `/api/physics/bubble-fusion` | Simulate simplified bubble collapse |
| `GET` | `/api/physics/bubble-fusion/defaults` | List bubble defaults, options, and advisory limits |

All request fields have model defaults, so `{}` is a valid JSON body. FastAPI
returns `422` for malformed types. Calculation failures are returned as `500`
responses with a `detail` field.

The `limits` returned by the two defaults endpoints are guidance for clients;
the Pydantic request models do not currently enforce those numeric ranges.

## Quantum tunneling

`POST /api/physics/quantum-tunneling` calculates a WKB tunneling probability.
Electron screening raises the effective collision energy before the barrier
integral is evaluated.

```bash
curl -X POST http://localhost:8010/api/physics/quantum-tunneling \
  -H 'Content-Type: application/json' \
  -d '{
    "z1": 1,
    "z2": 1,
    "a1": 2.0,
    "a2": 2.0,
    "energy_kev": 0.1,
    "temperature_k": 300.0,
    "potential_type": "screened",
    "screening_enhancement": 1.0,
    "material": "palladium",
    "pressure_atm": 1.0
  }'
```

### Request fields

| Field | Default | Units or allowed values |
| --- | --- | --- |
| `z1`, `z2` | `1` | Nuclear charge numbers |
| `a1`, `a2` | `2.0` | Nuclear mass numbers |
| `energy_kev` | `0.1` | Center-of-mass energy, keV |
| `temperature_k` | `300.0` | K |
| `potential_type` | `screened` | `coulomb`, `screened`, `woods_saxon` |
| `screening_enhancement` | `1.0` | Multiplier applied to material screening energy |
| `material` | `palladium` | `palladium`, `nickel`, `titanium`, `platinum` |
| `pressure_atm` | `1.0` | atm; accepted but not used or returned by the current calculation |

The response contains:

- Scalar results: `tunneling_probability`, `gamow_factor`,
  `barrier_height_kev`, `classical_turning_point_m`,
  `screening_energy_kev`, and `enhancement_factor`.
- Diagnostic factors: `electron_screening_enhancement`,
  `temperature_enhancement`, and `method`.
- Visualization arrays: 100-point `potential_curve` and 100-point
  `wave_function`.
- The effective calculation `parameters`.

`GET /api/physics/quantum-tunneling/defaults` is the source of truth for
client-selectable materials, potentials, screening energies, and suggested
ranges.

## Fusion-rate estimate

`POST /api/physics/fusion-rate` evaluates the cross section near the Gamow peak
using a configured S-factor, then estimates the volumetric rate and power.

```json
{
  "reaction_type": "d-d",
  "temperature_k": 1000.0,
  "density_per_cm3": 1e22,
  "material": "palladium",
  "loading_ratio": 0.8
}
```

Configured reaction identifiers include `d-d`, `d-t`, `d-he3`, `p-b11`, and
`p-li7`. `GET /api/physics/reactions` returns the exact configured Q-values and
S-factors.

The response fields are `reaction_rate_per_s`, `cross_section_barn`,
`s_factor_kev_barn`, `mean_energy_kev`, `q_value_mev`,
`power_density_w_cm3`, `enhancement_factors`, and `parameters`.

Despite its name, `reaction_rate_per_s` is calculated from number density as a
rate per cubic metre per second; consumers should not interpret it as the total
rate for a sample volume.

## LENR enhancement

`POST /api/physics/lenr-enhancement` multiplies the selected model factors. The
available mechanism identifiers are:

- `electron_screening`
- `phonon_assisted`
- `heavy_electron`
- `coherent_multi_body`
- `loading_ratio`
- `defect_enhancement`
- `electromagnetic_field`

Fetch the same list and descriptions from
`GET /api/physics/lenr-enhancement/mechanisms`.

```bash
curl -X POST http://localhost:8010/api/physics/lenr-enhancement \
  -H 'Content-Type: application/json' \
  -d '{
    "energy_kev": 0.025,
    "temperature_k": 350.0,
    "loading_ratio": 0.9,
    "material": "palladium",
    "defect_density": 0.01,
    "mechanisms": ["electron_screening", "loading_ratio"]
  }'
```

Omit `mechanisms` or set it to `null` to evaluate all mechanisms. An unknown
mechanism currently becomes a `500` calculation error rather than a validation
error.

The response contains `total_enhancement`, `individual_factors`,
`dominant_mechanism`, `parameters`, and `warnings`. Each individual factor is
clamped to the range `1e-10` through `1e20`; their product is not separately
clamped.

### Enhanced reaction rate

`POST /api/physics/lenr-reaction-rate` combines the D-D tunneling model with
hydrogen number density and the LENR enhancement factors.

```json
{
  "temperature_k": 400.0,
  "loading_ratio": 0.9,
  "material": "palladium",
  "defect_density": 0.01,
  "volume_cm3": 1.0,
  "include_enhancements": true
}
```

The response contains `reaction_rate_per_cm3_s`, `total_reaction_rate_s`,
`power_output_w`, base and enhanced tunneling probabilities,
`total_enhancement`, `hydrogen_density_per_cm3`, `thermal_energy_kev`, and
`enhancement_factors`.

## Bubble-fusion model

`POST /api/physics/bubble-fusion` uses a simplified Rayleigh-Plesset collapse
estimate, adiabatic heating, and a D-D Gamow-factor estimate. It returns both
peak collapse conditions and a 500-point, two-cycle visualization series.

```bash
curl -X POST http://localhost:8010/api/physics/bubble-fusion \
  -H 'Content-Type: application/json' \
  -d '{
    "initial_radius_um": 10.0,
    "acoustic_pressure_bar": 1.2,
    "frequency_khz": 20.0,
    "ambient_pressure_bar": 1.0,
    "ambient_temperature_k": 298.0,
    "fluid_type": "water",
    "gas_type": "deuterium",
    "gas_fraction": 0.8
  }'
```

Advertised fluids are `water`, `d2o`, `acetone`, and `d_acetone`. Advertised
gases are `air`, `argon`, `deuterium`, and `xenon`. Unknown strings currently
fall back to water or deuterium, respectively, so clients should validate
against `GET /api/physics/bubble-fusion/defaults`.

The response has three top-level objects:

- `collapse_results`: peak temperature, pressure, minimum radius, compression,
  collapse time, velocity, estimated fusion probability and neutron yield,
  energy density, and threshold flags.
- `timeseries`: parallel `time_us`, `radius_um`, `temperature_k`, and
  `pressure_bar` arrays.
- `parameters`: the submitted model inputs.

The implementation caps compression ratio, temperature, pressure, and collapse
velocity for numerical stability. These caps and the quasi-static time series
make this an exploratory visualization model, not a high-fidelity
hydrodynamics solver.

## Real-time simulation WebSocket

### Connection and start protocol

Connect to:

```text
ws://localhost:8010/api/ws/simulation/{simulation_type}/{simulation_id}
```

`simulation_type` must be `quantum-tunneling`, `lenr`, or `bubble-fusion`.
`simulation_id` is a client-generated registry key; it does not refer to a
persisted REST resource.

Within 30 seconds of connection, send:

```json
{
  "action": "start",
  "params": {
    "temperature_k": 350.0,
    "loading_ratio": 0.5,
    "target_loading": 0.95,
    "material": "palladium"
  },
  "duration_steps": 100
}
```

Send `{"action": "stop"}` while the task is running to cancel it.

The server emits:

| Type | Meaning |
| --- | --- |
| `simulation_update` | Progress and simulation-specific data |
| `simulation_complete` | Successful final result |
| `simulation_cancelled` | Task stopped or cancelled |
| `simulation_error` | Error caught inside a simulation task |
| `error` | Protocol, simulation-type, timeout, or router-level error |

Every update includes `simulation_id`, `step`, `total_steps`, `progress`,
`timestamp`, and `data`. The fields inside `data` depend on the simulation type.
For bubble fusion, `duration_steps` is passed to the model as the number of
acoustic cycles.

Minimal browser example:

```javascript
const socket = new WebSocket(
  'ws://localhost:8010/api/ws/simulation/lenr/example-1'
);

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({
    action: 'start',
    params: {
      temperature_k: 350,
      loading_ratio: 0.5,
      target_loading: 0.95,
      material: 'palladium'
    },
    duration_steps: 100
  }));
});

socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  console.log(message.type, message);
});
```

### Lifecycle and diagnostics

- `GET /api/ws/active` returns simulation IDs with active connections and
  simulation IDs retained in the task registry.
- `GET /api/ws/connections/{simulation_id}` returns the active client count.
- Reusing a `simulation_id` cancels the existing task for that ID.
- Disconnecting the last client cancels its running task.
- State is process-local and is lost when the backend restarts.

### Current streaming constraints

- The `quantum-tunneling` stream is not operational: its runner constructs
  `WKBTunnelingCalculator` with unsupported constructor arguments and reports
  an error before producing updates. The REST quantum-tunneling endpoint is the
  working interface.
- The implemented path is `/api/ws/simulation/{type}/{id}`. The older
  `/api/ws/physics/{id}` path referenced by
  `frontend/src/api/physics/websocketClient.ts` is not mounted.
- The React hook in `frontend/src/hooks/useSimulationWebSocket.js` wraps the
  implemented protocol, but no current simulation page imports that hook.

## Troubleshooting

### REST works but streaming does not

Confirm that the backend port matches the WebSocket URL. In frontend
development, `frontend/src/services/websocket.js` uses port `8000` even when
`REACT_APP_API_URL` points elsewhere.

### Swagger UI returns 404

Use `/api/docs`, not `/docs`. `app.main` explicitly configures the prefixed
documentation URL.

### Request values outside advertised limits are accepted

The defaults endpoints publish advisory limits, but the request models only
enforce types. Validate ranges in the caller until server-side bounds are
added.

### A calculation returns HTTP 500

Inspect the response `detail`. Common causes include an unknown LENR mechanism,
an unsupported tunneling potential, or nonphysical numeric inputs. The
calculation routes currently translate model exceptions to HTTP 500.

## Verification

The REST contracts are covered by:

```bash
cd LENR_SIM_APP_v2/backend
pytest tests/test_integration/test_api_integration.py
```

The integration suite does not exercise an actual WebSocket connection; verify
streaming changes separately with a WebSocket client.
