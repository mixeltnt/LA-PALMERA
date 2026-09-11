@echo off
setlocal
chcp 65001 >nul
title Instalador La Palmera POS - Windows

echo ================================================================
echo             INSTALADOR OFICIAL - LA PALMERA POS
echo                 Sistema de Punto de Venta
echo ================================================================
echo.
echo  Instalando aplicacion de escritorio y configurando datos...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un inconveniente durante la instalacion.
    pause
    exit /b %errorlevel%
)

echo.
echo ================================================================
echo      INSTALACION COMPLETADA CON EXITO
echo ================================================================
echo  Se ha creado el acceso directo "La Palmera POS" en su Escritorio.
echo.
pause
