#!/bin/bash

echo "Installing required dependencies for LENR Simulation App v2..."
cd frontend || exit

echo "Installing Three.js..."
npm install --save three

echo "Installing Material-UI..."
npm install --save @mui/material @emotion/react @emotion/styled

echo
echo "Dependencies successfully installed!"
echo "You can now run the application using ./start.sh"
echo 