@echo off
setlocal

set "LNK=%USERPROFILE%\Desktop\La Palmera.lnk"
set "NODE="

for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE set "NODE=%%i"
if not defined NODE (
  echo No se encontro node.exe. Instale Node.js primero.
  exit /b 1
)

set "VBS=%TEMP%\lapalmera-acceso.vbs"
set "LPDIR=%~dp0"
set "CJS=%LPDIR%la-palmera.cjs"

> "%VBS%" echo Set oWS = WScript.CreateObject("WScript.Shell")
>> "%VBS%" echo sLinkFile = "%LNK%"
>> "%VBS%" echo Set oLink = oWS.CreateShortcut(sLinkFile)
>> "%VBS%" echo oLink.TargetPath = "%NODE%"
>> "%VBS%" echo oLink.Arguments = """%CJS%"""
>> "%VBS%" echo oLink.WorkingDirectory = "%LPDIR%"
>> "%VBS%" echo oLink.IconLocation = "%SystemRoot%\System32\shell32.dll,14"
>> "%VBS%" echo oLink.Description = "La Palmera - Sistema de ventas"
>> "%VBS%" echo oLink.Save()

wscript //nologo "%VBS%"
del "%VBS%" >nul 2>nul

echo Acceso directo "La Palmera" creado en el Escritorio.
exit /b 0