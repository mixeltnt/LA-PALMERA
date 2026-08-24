@echo off
setlocal
set "LOGDIR=%~dp0logs"
set "PIDFILE=%LOGDIR%\lapalmera-backend.pid"
set "STOPFLAG=%LOGDIR%\lapalmera-detenido.flag"

if not exist "%PIDFILE%" (
  echo La Palmera no fue iniciada por el launcher: no hay nada que cerrar.
  exit /b 0
)

set /p PID=<"%PIDFILE%"
if not defined PID goto :limpio

tasklist /FI "PID eq %PID%" /FO CSV /NH 2>nul | findstr /i "node.exe" >nul
if errorlevel 1 (
  echo El proceso %PID% ya no existe o no corresponde al backend de La Palmera.
  goto :limpio
)

> "%STOPFLAG%" echo 1
taskkill /PID %PID% /F >nul 2>nul
echo La Palmera se ha cerrado correctamente.

:limpio
del "%PIDFILE%" >nul 2>nul
exit /b 0