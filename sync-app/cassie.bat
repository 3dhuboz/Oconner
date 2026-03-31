@echo off
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
node sync.js Cassie
pause
