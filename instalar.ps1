# Instalador Automatizado para La Palmera POS Windows
$ErrorActionPreference = "Stop"

$AppName = "La Palmera POS"
$ExeName = "LaPalmera.exe"
$SourceDir = $PSScriptRoot

# 1. Directorio del Programa (independiente de los datos)
$InstallDir = "$env:LOCALAPPDATA\Programs\LaPalmera"
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "-> Copiando archivos de la aplicacion a: $InstallDir" -ForegroundColor Cyan
Copy-Item "$SourceDir\$ExeName" "$InstallDir\$ExeName" -Force
Get-ChildItem -Path $SourceDir -Filter "*.dll" | ForEach-Object {
    Copy-Item $_.FullName "$InstallDir\$($_.Name)" -Force
}
if (Test-Path "$SourceDir\icon.ico") {
    Copy-Item "$SourceDir\icon.ico" "$InstallDir\icon.ico" -Force
}

# 2. Directorio de Datos del Negocio (C:\LaPalmera)
$DataDir = "C:\LaPalmera"
$SubDirs = @("database", "backups", "images", "exports", "config")

Write-Host "-> Verificando estructura de datos en: $DataDir" -ForegroundColor Cyan
foreach ($sub in $SubDirs) {
    $fullPath = Join-Path $DataDir $sub
    if (!(Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "   + Carpeta creada: $fullPath" -ForegroundColor DarkGray
    }
}

# Inicialización segura en PC nuevo si no existe base de datos previa (NUNCA sobrescribe una base existente)
$targetDb = Join-Path $DataDir "database\lapalmera.db"
$sourceDb = Join-Path $SourceDir "database\lapalmera.db"
if (!(Test-Path $targetDb) -and (Test-Path $sourceDb)) {
    Write-Host "-> Inicializando base de datos base con catalogo en: $targetDb" -ForegroundColor Cyan
    Copy-Item $sourceDb $targetDb -Force
}

# 3. Creación de Acceso Directo en el Escritorio
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "La Palmera POS.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$InstallDir\$ExeName"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Sistema de Punto de Venta La Palmera"
if (Test-Path "$InstallDir\icon.ico") {
    $Shortcut.IconLocation = "$InstallDir\icon.ico, 0"
}
$Shortcut.Save()
Write-Host "-> Acceso directo creado en el Escritorio: $ShortcutPath" -ForegroundColor Green

# 4. Creación de Acceso Directo en Menú Inicio
$StartMenuPath = [Environment]::GetFolderPath("Programs")
$StartMenuShortcut = Join-Path $StartMenuPath "La Palmera POS.lnk"
$ShortcutStart = $WshShell.CreateShortcut($StartMenuShortcut)
$ShortcutStart.TargetPath = "$InstallDir\$ExeName"
$ShortcutStart.WorkingDirectory = $InstallDir
$ShortcutStart.Description = "Sistema de Punto de Venta La Palmera"
if (Test-Path "$InstallDir\icon.ico") {
    $ShortcutStart.IconLocation = "$InstallDir\icon.ico, 0"
}
$ShortcutStart.Save()
Write-Host "-> Acceso directo agregado al Menu Inicio" -ForegroundColor Green

Write-Host ""
Write-Host "¡Instalacion finalizada con exito!" -ForegroundColor Green
