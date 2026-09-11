@echo off
setlocal

set "TARGET_EXE=%LOCALAPPDATA%\Programs\LaPalmera\LaPalmera.exe"
set "LOCAL_EXE=%~dp0LaPalmera.exe"
set "ICON_FILE=%LOCALAPPDATA%\Programs\LaPalmera\icon.ico"

if exist "%TARGET_EXE%" (
  set "EXE_TO_RUN=%TARGET_EXE%"
) else if exist "%LOCAL_EXE%" (
  set "EXE_TO_RUN=%LOCAL_EXE%"
) else (
  set "EXE_TO_RUN=%TARGET_EXE%"
)

set "LNK=%USERPROFILE%\Desktop\La Palmera POS.lnk"
set "VBS=%TEMP%\lapalmera-acceso.vbs"

> "%VBS%" echo Set oWS = WScript.CreateObject("WScript.Shell")
>> "%VBS%" echo sLinkFile = "%LNK%"
>> "%VBS%" echo Set oLink = oWS.CreateShortcut(sLinkFile)
>> "%VBS%" echo oLink.TargetPath = "%EXE_TO_RUN%"
>> "%VBS%" echo oLink.WorkingDirectory = "%LOCALAPPDATA%\Programs\LaPalmera"
>> "%VBS%" echo oLink.IconLocation = "%EXE_TO_RUN%,0"
>> "%VBS%" echo oLink.Description = "La Palmera - Sistema POS y Gestion Comercial"
>> "%VBS%" echo oLink.Save()

wscript //nologo "%VBS%"
del "%VBS%" >nul 2>nul

echo ================================================================
echo  Acceso directo "La Palmera POS" creado exitosamente con su logo.
echo ================================================================
exit /b 0