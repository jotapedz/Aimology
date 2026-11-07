@echo off
setlocal
cd /d "%~dp0"

rem Prefer the regular installation; also support the runtime used by ChatGPT.
set "AIMOLOGY_NODE="
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined AIMOLOGY_NODE set "AIMOLOGY_NODE=%%I"
if defined AIMOLOGY_NODE goto node_found
if exist "%ProgramFiles%\nodejs\node.exe" set "AIMOLOGY_NODE=%ProgramFiles%\nodejs\node.exe"
if defined AIMOLOGY_NODE goto node_found
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "AIMOLOGY_NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if defined AIMOLOGY_NODE goto node_found
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "AIMOLOGY_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if defined AIMOLOGY_NODE goto node_found

echo Nao foi possivel localizar o Node.js neste computador.
echo Instale o Node.js 22 ou superior em https://nodejs.org e abra este arquivo novamente.
if /i "%~1"=="--check" exit /b 1
pause
exit /b 1

:node_found
if /i "%~1"=="--check" goto check_node
echo Aimology - Abra http://127.0.0.1:4173 no navegador.
echo Mantenha esta janela aberta durante o treino.
"%AIMOLOGY_NODE%" "%~dp0server.mjs"
pause
exit /b

:check_node
echo Node.js localizado: "%AIMOLOGY_NODE%"
"%AIMOLOGY_NODE%" --version
exit /b %errorlevel%
