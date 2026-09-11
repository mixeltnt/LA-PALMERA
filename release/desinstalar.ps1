# Desinstalador seguro para La Palmera POS (Preserva datos de C:\LaPalmera)
$AppName = "La Palmera POS"
$InstallDir = "$env:LOCALAPPDATA\Programs\LaPalmera"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "La Palmera POS.lnk"
$StartMenuPath = [Environment]::GetFolderPath("Programs")
$StartMenuShortcut = Join-Path $StartMenuPath "La Palmera POS.lnk"

Write-Host "-> Removiendo accesos directos..." -ForegroundColor Yellow
if (Test-Path $ShortcutPath) { Remove-Item $ShortcutPath -Force }
if (Test-Path $StartMenuShortcut) { Remove-Item $StartMenuShortcut -Force }

Write-Host "-> Removiendo archivos del programa..." -ForegroundColor Yellow
if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }

Write-Host "-> Sus datos y base de datos permanecen seguros en C:\LaPalmera\" -ForegroundColor Green
Write-Host "¡Desinstalación completada!" -ForegroundColor Green
