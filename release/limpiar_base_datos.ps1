# Script de reinicio de base de datos a cero para La Palmera POS v32
$ErrorActionPreference = "Continue"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   REINICIO DE BASE DE DATOS A CERO - LA PALMERA POS v32        " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Detener procesos de La Palmera
Write-Host "-> Cerrando La Palmera POS si esta en ejecucion..." -ForegroundColor Cyan
Stop-Process -Name "LaPalmera" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$targetDb = "C:\LaPalmera\database\lapalmera.db"
$backupDir = "C:\LaPalmera\backups"
$sourceDir = $PSScriptRoot

# 2. Crear respaldo preventivo antes de limpiar
if (Test-Path $targetDb) {
    if (!(Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    $timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $backupPath = Join-Path $backupDir "lapalmera_backup_pre_reinicio_$timestamp.db"
    Copy-Item $targetDb $backupPath -Force
    Write-Host "-> Respaldo preventivo guardado en: $backupPath" -ForegroundColor DarkGray
}

# 3. Restaurar plantilla limpia oficial (0 ventas, 0 compras, 0 deudas)
$cleanTemplate = Join-Path $sourceDir "database\lapalmera.db"
if (Test-Path $cleanTemplate) {
    Copy-Item $cleanTemplate $targetDb -Force
    Write-Host "-> Base de datos local SQLite restaurada a 0 correctamente." -ForegroundColor Green
} else {
    # Buscar plantilla en ubicaciones conocidas
    $altTemplate = "c:\Users\statu\Desktop\LA-PALMERA\release\database\lapalmera.db"
    if (Test-Path $altTemplate) {
        Copy-Item $altTemplate $targetDb -Force
        Write-Host "-> Base de datos local SQLite restaurada a 0 desde plantilla de release." -ForegroundColor Green
    }
}

# 4. Limpiar Neon Cloud si el backend esta presente
$backendReset = Join-Path $sourceDir "..\backend\scripts\resetParaEntrega.js"
if (Test-Path $backendReset) {
    Write-Host "-> Limpiando replica remota en Neon PostgreSQL Cloud..." -ForegroundColor Cyan
    try {
        Push-Location (Join-Path $sourceDir "..\backend")
        node scripts/resetParaEntrega.js
        Pop-Location
    } catch {
        Write-Host "   (Aviso: Neon Cloud no sincronizado en este momento)" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "¡Base de datos restablecida a 0 exitosamente!" -ForegroundColor Green
Write-Host "El proximo folio de venta comenzara en la Boleta #1." -ForegroundColor Green
