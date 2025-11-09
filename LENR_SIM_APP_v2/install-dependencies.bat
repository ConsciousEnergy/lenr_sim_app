@echo off
echo Installing required dependencies for LENR Simulation App v2...
cd frontend
echo Installing Three.js...
call npm install --save three
echo Installing Material-UI...
call npm install --save @mui/material @emotion/react @emotion/styled
echo.
echo Dependencies successfully installed!
echo You can now run the application using start.bat
echo. 