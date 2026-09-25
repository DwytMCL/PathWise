@echo off
cd /d "%~dp0"
set "PLAYWRIGHT_NODE=C:\Users\dwigh\AppData\Local\Programs\Python\Python311\Lib\site-packages\playwright\driver\node.exe"

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Starting PathWise dev server with system Node...
    node node_modules/next/dist/bin/next dev
) else if exist "%PLAYWRIGHT_NODE%" (
    echo Starting PathWise dev server on http://localhost:3000...
    "%PLAYWRIGHT_NODE%" node_modules/next/dist/bin/next dev
) else (
    echo Node.js not found. Please install Node.js from https://nodejs.org/
    pause
)
