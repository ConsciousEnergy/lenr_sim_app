@echo off
REM Run backend tests from the backend directory so coverage finds tests/.coveragerc.
REM From repo root, activate your venv first if you use one: venv\Scripts\activate
cd /d "%~dp0LENR_SIM_APP_v2\backend"
python -m pytest tests/ -v --tb=short
