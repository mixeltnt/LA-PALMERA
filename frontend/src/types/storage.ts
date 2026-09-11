// Tipos para Almacenamiento Local Configurable, Respaldos y Sincronización

export interface StorageConfig {
  baseDir: string; // por ejemplo "C:\\LaPalmera" o ruta personalizada
  databaseDir: string; // baseDir + "\\database"
  backupsDir: string; // baseDir + "\\backups"
  imagesDir: string; // baseDir + "\\images"
  exportsDir: string; // baseDir + "\\exports"
  configDir: string; // baseDir + "\\config"
  databasePath: string; // baseDir + "\\database\\lapalmera.db"
  autoBackupEnabled: boolean;
  autoBackupIntervalHours: number;
}

export interface BackupRecord {
  id: string | number;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  tipo: 'manual' | 'automatico' | 'previo_actualizacion';
  descripcion?: string;
  creadoEn: string;
  checksum?: string;
}

export interface SyncQueueItem {
  id: string | number;
  tabla: string;
  registroId: string | number;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  payloadJson: string;
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'error';
  intentos: number;
  ultimoError?: string;
  creadoEn: string;
  sincronizadoEn?: string;
}

export interface BusinessConfig {
  nombreComercial: string;
  rut: string;
  giro?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
  impresoraNombre?: string;
  tipoBoleta?: 'termica_58mm' | 'termica_80mm' | 'carta' | 'sin_impresion';
  mensajePieBoleta?: string;
  monedaSimbolo: string;
}
