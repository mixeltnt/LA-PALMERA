@echo off
setlocal
chcp 65001 >nul
title Desinstalador La Palmera POS

echo ================================================================
echo             DESINSTALADOR - LA PALMERA POS
echo ================================================================
echo.
echo  IMPORTANTE: Los datos del negocio en C:\LaPalmera NO seran eliminados.
echo.
pause
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0desinstalar.ps1"
echo.
pause
