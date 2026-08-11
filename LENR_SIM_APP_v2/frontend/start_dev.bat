@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

REM Dev frontend launcher used by LENR_SIM_APP_v2\start_app.bat.
REM Keeps npm sync + Vite in THIS window so install/start errors stay visible.

echo ========================================
echo LENR Frontend (Vite)
echo ========================================
echo.

where node >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Node.js is not on PATH. Install Node 18+ and retry.
    goto :fail
)

where npm >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: npm is not on PATH.
    goto :fail
)

IF NOT EXIST package.json (
    echo ERROR: package.json not found in %CD%
    goto :fail
)

IF NOT EXIST package-lock.json (
    echo ERROR: package-lock.json not found. Run git pull origin development.
    goto :fail
)

IF NOT DEFINED REACT_APP_API_URL set "REACT_APP_API_URL=http://localhost:8010"
IF NOT DEFINED VITE_API_URL set "VITE_API_URL=http://localhost:8010"

REM Sync deps when node_modules is missing or package-lock.json changed.
REM Prefer npm install when node_modules already exists (much less RAM than npm ci).
set NEED_SYNC=0
IF NOT EXIST node_modules set NEED_SYNC=1
IF NOT EXIST node_modules\.lockfile-hash set NEED_SYNC=1

IF !NEED_SYNC!==0 (
    set LOCK_HASH=
    FOR /F "skip=1 delims=" %%H IN ('certutil -hashfile package-lock.json SHA256 2^>nul') DO (
        IF NOT DEFINED LOCK_HASH set "LOCK_HASH=%%H"
    )
    set "LOCK_HASH=!LOCK_HASH: =!"
    set /P STORED_HASH=<node_modules\.lockfile-hash
    set "STORED_HASH=!STORED_HASH: =!"
    IF /I NOT "!LOCK_HASH!"=="!STORED_HASH!" set NEED_SYNC=1
)

IF !NEED_SYNC!==1 (
    IF NOT EXIST node_modules (
        echo Installing frontend dependencies via npm ci --legacy-peer-deps...
        echo This can take several minutes and uses a few GB of RAM.
        call npm ci --legacy-peer-deps
        IF ERRORLEVEL 1 (
            echo npm ci failed — falling back to npm install --legacy-peer-deps...
            call npm install --legacy-peer-deps
            IF ERRORLEVEL 1 goto :npm_fail
        )
    ) ELSE (
        echo Lockfile changed — updating frontend dependencies via npm install...
        call npm install --legacy-peer-deps
        IF ERRORLEVEL 1 goto :npm_fail
    )
    set LOCK_HASH=
    FOR /F "skip=1 delims=" %%H IN ('certutil -hashfile package-lock.json SHA256 2^>nul') DO (
        IF NOT DEFINED LOCK_HASH set "LOCK_HASH=%%H"
    )
    set "LOCK_HASH=!LOCK_HASH: =!"
    IF DEFINED LOCK_HASH (
        >node_modules\.lockfile-hash echo !LOCK_HASH!
    )
) ELSE (
    echo Frontend node_modules matches package-lock.json — skipping install.
)

echo.
echo Expected audit on development tip: 2 moderate (react-router), 0 high.
echo Funding / vulnerability lines are npm noise, not a Vite failure.
echo.
echo Starting Vite on http://localhost:3000 ...
echo Backend API expected at http://localhost:8010
echo.

call npm start
IF ERRORLEVEL 1 goto :npm_fail
goto :eof

:npm_fail
echo.
echo ERROR: Frontend dependency install or npm start failed.
echo Close other heavy apps if memory is low, then retry:
echo   cd /d "%~dp0"
echo   rmdir /s /q node_modules
echo   npm ci --legacy-peer-deps
echo   npm start
echo.

:fail
echo.
pause
exit /b 1
