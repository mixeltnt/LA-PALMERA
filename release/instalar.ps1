# Instalador Automatizado para La Palmera POS Windows v32
$ErrorActionPreference = "Stop"

$AppName = "La Palmera POS"
$ExeName = "LaPalmera.exe"
$SourceDir = $PSScriptRoot

# 1. Detener instancias previas
Stop-Process -Name "LaPalmera" -Force -ErrorAction SilentlyContinue

# 2. Directorio del Programa (independiente de los datos)
$InstallDir = "$env:LOCALAPPDATA\Programs\LaPalmera"
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "-> Copiando archivos de la aplicacion v32 a: $InstallDir" -ForegroundColor Cyan
Copy-Item "$SourceDir\$ExeName" "$InstallDir\$ExeName" -Force
Get-ChildItem -Path $SourceDir -Filter "*.dll" | ForEach-Object {
    Copy-Item $_.FullName "$InstallDir\$($_.Name)" -Force
}
if (Test-Path "$SourceDir\icon.ico") {
    Copy-Item "$SourceDir\icon.ico" "$InstallDir\icon.ico" -Force
}
if (Test-Path "$SourceDir\desinstalar.ps1") {
    Copy-Item "$SourceDir\desinstalar.ps1" "$InstallDir\desinstalar.ps1" -Force
}
if (Test-Path "$SourceDir\Desinstalar-LaPalmera.cmd") {
    Copy-Item "$SourceDir\Desinstalar-LaPalmera.cmd" "$InstallDir\Desinstalar-LaPalmera.cmd" -Force
}

# 3. Directorio de Datos del Negocio (C:\LaPalmera)
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

# Permisos completos
try {
    icacls "C:\LaPalmera" /grant "*S-1-1-0:(OI)(CI)F" /T /Q /C | Out-Null
    icacls "C:\LaPalmera" /grant "Usuarios:(OI)(CI)F" /T /Q /C | Out-Null
} catch {}

# 4. Creación de Acceso Directo en el Escritorio
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "La Palmera POS.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$InstallDir\$ExeName"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Sistema de Punto de Venta La Palmera v32"
if (Test-Path "$InstallDir\icon.ico") {
    $Shortcut.IconLocation = "$InstallDir\icon.ico, 0"
}
$Shortcut.Save()
Write-Host "-> Acceso directo creado en el Escritorio: $ShortcutPath" -ForegroundColor Green

# 5. Creación de Acceso Directo en Menú Inicio
$StartMenuPath = [Environment]::GetFolderPath("Programs")
$StartMenuShortcut = Join-Path $StartMenuPath "La Palmera POS.lnk"
$ShortcutStart = $WshShell.CreateShortcut($StartMenuShortcut)
$ShortcutStart.TargetPath = "$InstallDir\$ExeName"
$ShortcutStart.WorkingDirectory = $InstallDir
$ShortcutStart.Description = "Sistema de Punto de Venta La Palmera v32"
if (Test-Path "$InstallDir\icon.ico") {
    $ShortcutStart.IconLocation = "$InstallDir\icon.ico, 0"
}
$ShortcutStart.Save()
Write-Host "-> Acceso directo agregado al Menu Inicio" -ForegroundColor Green

# 6. Registro de Desinstalación
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\LaPalmera"
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name "DisplayName" -Value "La Palmera - Sistema POS v32"
Set-ItemProperty -Path $regPath -Name "DisplayVersion" -Value "32.0.0"
Set-ItemProperty -Path $regPath -Name "Publisher" -Value "La Palmera"
Set-ItemProperty -Path $regPath -Name "DisplayIcon" -Value "$InstallDir\icon.ico"
Set-ItemProperty -Path $regPath -Name "UninstallString" -Value "powershell.exe -ExecutionPolicy Bypass -File `"$InstallDir\desinstalar.ps1`""
Set-ItemProperty -Path $regPath -Name "InstallLocation" -Value "$InstallDir"

Write-Host ""
Write-Host "¡Instalacion de La Palmera POS v32 finalizada con exito!" -ForegroundColor Green
