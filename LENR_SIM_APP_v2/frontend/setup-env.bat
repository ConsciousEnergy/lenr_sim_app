@echo off
echo Setting up environment variables for LENR Simulation App...
echo.

REM Check if .env.local already exists
if exist .env.local (
    echo .env.local file already exists. Backing up to .env.local.backup
    copy .env.local .env.local.backup /Y
)

REM Copy the example environment file
if exist env.example (
    echo Copying env.example to .env.local...
    copy env.example .env.local /Y
    echo Environment file created successfully!
    echo.
    echo Please edit .env.local if you need to change any settings.
) else (
    echo Creating .env.local with default values...
    (
        echo # LENR Simulation App Frontend Environment Variables
        echo # Create React App requires REACT_APP_ prefix for custom environment variables
        echo.
        echo # API Configuration
        echo REACT_APP_API_URL=http://localhost:8000
        echo REACT_APP_API_BASE_URL=http://localhost:8000
        echo.
        echo # Development Settings
        echo REACT_APP_DEBUG_LEVEL=3
        echo REACT_APP_USE_MOCK_DATA=false
        echo REACT_APP_MOCK_DELAY=500
    ) > .env.local
    echo Environment file created with default values!
)

echo.
echo Environment setup complete!
echo Please restart your development server for changes to take effect.
pause
