#![windows_subsystem = "windows"]

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use windows_sys::Win32::UI::WindowsAndMessaging::{
    MessageBoxW, MB_ICONINFORMATION, MB_ICONQUESTION, MB_OK, MB_YESNO, IDYES,
};

static EXE_BYTES: &[u8] = include_bytes!("../../release/LaPalmera.exe");
static DLL_BYTES: &[u8] = include_bytes!("../../release/WebView2Loader.dll");
static ICO_BYTES: &[u8] = include_bytes!("../../release/icon.ico");
static DB_BYTES: &[u8] = include_bytes!("../../release/database/lapalmera.db");

const DESINSTALAR_PS1: &str = r#"
# Script de desinstalacion de La Palmera POS
$appName = "LaPalmera"
$installDir = "$env:LOCALAPPDATA\Programs\LaPalmera"
$desktopLink = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "La Palmera POS.lnk")
$startMenuDir = [System.Environment]::GetFolderPath("Programs")
$startMenuLink = [System.IO.Path]::Combine($startMenuDir, "La Palmera POS.lnk")

# 1. Detener procesos
Stop-Process -Name $appName -Force -ErrorAction SilentlyContinue

# 2. Eliminar accesos directos
if (Test-Path $desktopLink) { Remove-Item $desktopLink -Force -ErrorAction SilentlyContinue }
if (Test-Path $startMenuLink) { Remove-Item $startMenuLink -Force -ErrorAction SilentlyContinue }

# 3. Eliminar registro de desinstalador
Remove-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\LaPalmera" -Recurse -Force -ErrorAction SilentlyContinue

# 4. Eliminar archivos de programa (Conservando C:\LaPalmera)
if (Test-Path $installDir) {
    Remove-Item $installDir -Recurse -Force -ErrorAction SilentlyContinue
}

[System.Windows.Forms.MessageBox]::Show(
    "La Palmera POS se ha desinstalado correctamente.`n`nSus datos comerciales y base de datos en C:\LaPalmera se mantuvieron intactos y protegidos.",
    "Desinstalación Completa",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
)
"#;

const DESINSTALAR_CMD: &str = r#"@echo off
title Desinstalador - La Palmera POS
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0desinstalar.ps1"
"#;

fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn show_message(text: &str, title: &str, is_question: bool) -> bool {
    let wide_text = to_wide(text);
    let wide_title = to_wide(title);
    let flags = if is_question {
        MB_YESNO | MB_ICONQUESTION
    } else {
        MB_OK | MB_ICONINFORMATION
    };
    let result = unsafe { MessageBoxW(0 as _, wide_text.as_ptr(), wide_title.as_ptr(), flags) };
    result == IDYES
}

fn get_install_dir() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        Path::new(&local_app_data).join("Programs").join("LaPalmera")
    } else {
        let home = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string());
        Path::new(&home)
            .join("AppData")
            .join("Local")
            .join("Programs")
            .join("LaPalmera")
    }
}

fn main() {
    // 1. Cerrar instancias previas si están abiertas
    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "LaPalmera.exe"])
        .output();

    let install_dir = get_install_dir();

    // 2. Crear carpetas de instalación
    if let Err(e) = fs::create_dir_all(&install_dir) {
        show_message(
            &format!("Error al crear el directorio de instalación:\n{}", e),
            "Error de Instalación",
            false,
        );
        return;
    }

    // 3. Extraer binarios y recursos
    let exe_path = install_dir.join("LaPalmera.exe");
    let dll_path = install_dir.join("WebView2Loader.dll");
    let ico_path = install_dir.join("icon.ico");
    let ps1_path = install_dir.join("desinstalar.ps1");
    let cmd_path = install_dir.join("Desinstalar-LaPalmera.cmd");

    if let Err(e) = fs::write(&exe_path, EXE_BYTES) {
        show_message(
            &format!("Error al escribir LaPalmera.exe:\n{}", e),
            "Error de Instalación",
            false,
        );
        return;
    }
    let _ = fs::write(&dll_path, DLL_BYTES);
    let _ = fs::write(&ico_path, ICO_BYTES);
    let _ = fs::write(&ps1_path, DESINSTALAR_PS1.trim());
    let _ = fs::write(&cmd_path, DESINSTALAR_CMD.trim());

    // 4. Asegurar carpetas persistentes de datos en C:\LaPalmera (Sin sobreescribir datos)
    let base_data = Path::new("C:\\LaPalmera");
    let _ = fs::create_dir_all(base_data.join("database"));
    let _ = fs::create_dir_all(base_data.join("backups"));
    let _ = fs::create_dir_all(base_data.join("images"));
    let _ = fs::create_dir_all(base_data.join("exports"));
    let _ = fs::create_dir_all(base_data.join("config"));

    // Inicializar base de datos plantilla en PC nuevo si no existe previamente
    let target_db = base_data.join("database").join("lapalmera.db");
    if !target_db.exists() {
        let _ = fs::write(&target_db, DB_BYTES);
    }

    // 5. Crear accesos directos y registrar desinstalador en Windows mediante PowerShell
    let ps_script = format!(
        r#"
$WshShell = New-Object -ComObject WScript.Shell

# Acceso directo en Escritorio
$desktop = [System.Environment]::GetFolderPath("Desktop")
$shortcutPath = [System.IO.Path]::Combine($desktop, "La Palmera POS.lnk")
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "{}"
$shortcut.WorkingDirectory = "{}"
$shortcut.IconLocation = "{},0"
$shortcut.Description = "La Palmera - Sistema POS y Gestión Comercial"
$shortcut.Save()

# Acceso directo en Menú Inicio
$startMenu = [System.Environment]::GetFolderPath("Programs")
$shortcutStartPath = [System.IO.Path]::Combine($startMenu, "La Palmera POS.lnk")
$shortcutStart = $WshShell.CreateShortcut($shortcutStartPath)
$shortcutStart.TargetPath = "{}"
$shortcutStart.WorkingDirectory = "{}"
$shortcutStart.IconLocation = "{},0"
$shortcutStart.Description = "La Palmera - Sistema POS"
$shortcutStart.Save()

# Registro de desinstalación en Panel de Control / Configuración de Windows
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\LaPalmera"
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name "DisplayName" -Value "La Palmera - Sistema POS"
Set-ItemProperty -Path $regPath -Name "DisplayVersion" -Value "19.0.0"
Set-ItemProperty -Path $regPath -Name "Publisher" -Value "La Palmera"
Set-ItemProperty -Path $regPath -Name "DisplayIcon" -Value "{}"
Set-ItemProperty -Path $regPath -Name "UninstallString" -Value "powershell.exe -ExecutionPolicy Bypass -File ""{}"""
Set-ItemProperty -Path $regPath -Name "InstallLocation" -Value "{}"
"#,
        exe_path.display(),
        install_dir.display(),
        ico_path.display(),
        exe_path.display(),
        install_dir.display(),
        ico_path.display(),
        ico_path.display(),
        ps1_path.display(),
        install_dir.display()
    );

    let _ = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &ps_script])
        .output();

    // 6. Mensaje final interactivo
    let success_msg = "¡La Palmera POS se instaló correctamente en este equipo!\n\n\
        • Acceso directo disponible en el Escritorio y Menú Inicio.\n\
        • Carpeta de base de datos y respaldos: C:\\LaPalmera\\\n\n\
        ¿Desea iniciar La Palmera ahora?";

    if show_message(success_msg, "Instalador de La Palmera POS", true) {
        let _ = Command::new(&exe_path)
            .current_dir(&install_dir)
            .spawn();
    }
}
