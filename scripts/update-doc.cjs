const fs = require('fs');
const path = require('path');

const docPath = 'c:\\Users\\statu\\Desktop\\apk android\\ARQUITECTURA_Y_TECNOLOGIAS_APK.txt';

const content = `================================================================================
          LA PALMERA POS - FICHA TÉCNICA Y ARQUITECTURA MÓVIL (APK v4)
================================================================================

Este documento detalla la estructura, lenguajes, frameworks y arquitectura 
utilizados para la compilación de la versión Android (LaPalmera_v4.apk).

--------------------------------------------------------------------------------
1. RESUMEN DE LA VERSIÓN v4
--------------------------------------------------------------------------------
- Escáner de Códigos de Barras por Cámara: Integración con la cámara del 
  smartphone (html5-qrcode) para lectura de códigos EAN-13, Code 128 y QR en 
  Ventas, Stock y Compras.
- Captura de Fotografías de Productos: Posibilidad de tomar fotos directamente 
  con la cámara del celular o seleccionar de la galería (con compresión 
  automática a Base64 para almacenamiento ligero en SQLite) o ingresar URL.
- Visualización de Imágenes en Ventas: Miniaturas en el catálogo rápido, lista 
  de búsqueda y productos en el carrito de compras.
- Icono de Aplicación: Logotipo oficial de Salchicha Gourmet para el launcher 
  de Android en todas las densidades de pantalla.
- Responsividad 100% Móvil: Protección Safe-Area superior e inferior (Notch y 
  gestos de navegación), modales verticales adaptables y tablas con scroll suave.

--------------------------------------------------------------------------------
2. STACK TECNOLÓGICO Y FRAMEWORKS
--------------------------------------------------------------------------------

A. FRONTEND (INTERFAZ Y LÓGICA DE NEGOCIO):
   - Framework UI: React 19 (v19.2.7)
   - Lenguaje: JavaScript (ESNext) / TypeScript (TSX)
   - Bundler & Build Tool: Vite 6 / Rolldown
   - Enrutador: React Router DOM v7
   - Escáner de Cámara: html5-qrcode
   - Iconos: Bootstrap Icons & Lucide React
   - Estilos: CSS3 Moderno con variables personalizadas y soporte de Safe-Area.

B. CONTENEDOR NATIVO MÓVIL (ANDROID):
   - Framework de Puente Nativo: Capacitor 7 (Ionic Platform)
   - Permisos Nativos: android.permission.CAMERA, android.permission.INTERNET
   - Motor de Renderizado: Android System WebView con aceleración por hardware.
   - Herramienta de Compilación: Gradle 8.11
   - JDK: Eclipse Adoptium OpenJDK 21 (Temurin)

C. BACKEND Y BASE DE DATOS (MODO PC / SERVIDOR):
   - Runtime: Node.js (v20+)
   - Framework API: Express.js (REST API JSON)
   - Base de Datos Principal: SQLite 3 (100% local, embebida y ultra rápida).

--------------------------------------------------------------------------------
3. INSTRUCCIONES DE INSTALACIÓN DEL APK
--------------------------------------------------------------------------------
1. Copia el archivo "LaPalmera_v4.apk" a tu teléfono Android (por cable USB, 
   WhatsApp, Telegram o Google Drive).
2. Toca el archivo en tu teléfono y selecciona "Instalar".
3. Si Android solicita "Permitir instalar aplicaciones de fuentes desconocidas", 
   habilita el permiso para continuar.
4. Al abrir la app por primera vez, concede el permiso de Cámara para habilitar 
   el escáner de códigos de barras y la toma de fotografías de productos.

================================================================================
`;

fs.writeFileSync(docPath, content, 'utf8');
console.log('Updated ARQUITECTURA_Y_TECNOLOGIAS_APK.txt');
