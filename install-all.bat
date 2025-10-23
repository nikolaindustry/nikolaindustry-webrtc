@echo off
echo Installing dependencies for WebRTC CCTV Test Server...
echo.

echo Installing root dependencies...
npm install
echo.

echo Installing Viewer dependencies...
cd Viewer
npm install
cd ..
echo.

echo Installing Camera dependencies...
cd Camera
npm install
cd ..
echo.

echo All dependencies installed successfully!
echo.
echo To start the test server, run: npm start
echo.
pause