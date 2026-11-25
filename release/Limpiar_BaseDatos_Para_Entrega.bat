@echo off
setlocal
chcp 65001 >nul
title Reinicio de Base de Datos - La Palmera POS v32
cls

echo ================================================================================
echo           🧹 LA PALMERA POS v32 - REINICIO DE BASE DE DATOS A CERO 🧹
echo ================================================================================
echo.
echo Esta accion dejara el sistema 100%% en blanco para la entrega al cliente:
echo.
echo   • Vacia todas las ventas de prueba (El folio comenzara en #1)
echo   • Vacia compras, egresos y abastecimiento
echo   • Vacia turnos de caja, cierres y arqueos
echo   • Reinicia deudas de clientes fiados a $0
echo   • CONSERVA intacto el catalogo de productos, precios, categorias y usuarios
echo   • Crea un respaldo preventivo automatico en C:\LaPalmera\backups\
echo.
set /p confirm="¿Esta seguro que desea reiniciar la base de datos a 0? (S/N): "
if /i "%confirm%" NEQ "S" (
    echo.
    echo [INFO] Operacion cancelada por el usuario.
    echo.
    pause
    exit /b 0
)

echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0limpiar_base_datos.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Ocurrio un error al ejecutar el reinicio.
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ================================================================================
echo    ¡SISTEMA LISTO PARA ENTREGA! Base de datos inicializada en blanco (0).
echo ================================================================================
echo.
pause
