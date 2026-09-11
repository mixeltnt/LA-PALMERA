# 🖥️ LA PALMERA POS - Aplicación de Escritorio Windows

Sistema de Punto de Venta autónomo, offline-first, construido con React + TypeScript, Tauri 2 y SQLite local.

## 📦 Contenido de este Paquete de Instalación:
1. `Instalar-LaPalmera.cmd` -> Instalador de un solo clic.
2. `LaPalmera.exe` -> Aplicación nativa de escritorio compilada.
3. `icon.ico` -> Ícono de alta resolución.
4. `Desinstalar-LaPalmera.cmd` -> Desinstalador seguro.

---

## 🚀 Instrucciones de Instalación en Cualquier Computador Windows:

1. Copie la carpeta `release/` o el instalador al computador de destino.
2. Haga doble clic en **`Instalar-LaPalmera.cmd`** (o ejecute directamente `LaPalmera.exe`).
3. El instalador:
   - Instalará el programa en `%LOCALAPPDATA%\Programs\LaPalmera\`.
   - Creará el acceso directo **La Palmera POS** en su **Escritorio** y en el **Menú Inicio**.
   - Inicializará de forma automática la estructura de datos independiente en:
     ```text
     C:\LaPalmera\
     ├── database\  (Base de datos local SQLite lapalmera.db)
     ├── backups\   (Copias de respaldo de seguridad)
     ├── images\    (Fotografías de productos)
     ├── exports\   (Exportaciones Excel, PDF, reportes)
     └── config\    (Configuraciones locales del negocio)
     ```
4. ¡Abra el programa desde su acceso directo y utilícelo normalmente sin necesidad de Internet ni herramientas de desarrollo!

---

## 🔒 Separación de Programa y Datos:
- **Archivos del Programa**: `AppData\Local\Programs\LaPalmera\`
- **Datos y Base de Datos**: `C:\LaPalmera\`
- Reinstalar o actualizar el programa **NUNCA** eliminará sus datos ni sus respaldos.
