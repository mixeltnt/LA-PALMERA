// Servicio de Almacenamiento Local Configurable para La Palmera POS
import { StorageConfig } from '../types/storage';
import { isTauriEnvironment } from '../database/db';

const STORAGE_SETTINGS_KEY = 'lapalmera_storage_config';
const DEFAULT_BASE_DIR = 'C:\\LaPalmera';

export class StorageService {
  private static instance: StorageService;
  private currentConfig: StorageConfig;

  private constructor() {
    this.currentConfig = this.loadInitialConfig();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private buildConfig(baseDir: string): StorageConfig {
    const cleanBase = baseDir.replace(/[/\\]+$/, '');
    const sep = '\\';
    return {
      baseDir: cleanBase,
      databaseDir: `${cleanBase}${sep}database`,
      backupsDir: `${cleanBase}${sep}backups`,
      imagesDir: `${cleanBase}${sep}images`,
      exportsDir: `${cleanBase}${sep}exports`,
      configDir: `${cleanBase}${sep}config`,
      databasePath: `${cleanBase}${sep}database${sep}lapalmera.db`,
      autoBackupEnabled: true,
      autoBackupIntervalHours: 24,
    };
  }

  private loadInitialConfig(): StorageConfig {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.baseDir) {
          return {
            ...this.buildConfig(parsed.baseDir),
            autoBackupEnabled: parsed.autoBackupEnabled ?? true,
            autoBackupIntervalHours: parsed.autoBackupIntervalHours ?? 24,
          };
        }
      }
    } catch (e) {
      console.warn('Error leyendo configuración de almacenamiento guardada:', e);
    }
    return this.buildConfig(DEFAULT_BASE_DIR);
  }

  public getConfig(): StorageConfig {
    return { ...this.currentConfig };
  }

  public async setBaseDirectory(newBaseDir: string): Promise<StorageConfig> {
    if (!newBaseDir || newBaseDir.trim().length === 0) {
      throw new Error('La ruta base no puede estar vacía');
    }

    const newConfig = {
      ...this.buildConfig(newBaseDir.trim()),
      autoBackupEnabled: this.currentConfig.autoBackupEnabled,
      autoBackupIntervalHours: this.currentConfig.autoBackupIntervalHours,
    };

    // Si estamos en Tauri, asegurar que los subdirectorios existan
    if (isTauriEnvironment()) {
      await this.ensureDirectoriesExist(newConfig);
    }

    this.currentConfig = newConfig;
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(this.currentConfig));
    return this.currentConfig;
  }

  public async ensureDirectoriesExist(config: StorageConfig = this.currentConfig): Promise<void> {
    if (!isTauriEnvironment()) return;

    try {
      const { mkdir, exists } = await import('@tauri-apps/plugin-fs');
      
      const dirs = [
        config.baseDir,
        config.databaseDir,
        config.backupsDir,
        config.imagesDir,
        config.exportsDir,
        config.configDir,
      ];

      for (const dir of dirs) {
        const dirExists = await exists(dir);
        if (!dirExists) {
          await mkdir(dir, { recursive: true });
          console.log(`[Storage] Directorio creado: ${dir}`);
        }
      }
    } catch (err) {
      console.error('[Storage] Error asegurando directorios:', err);
    }
  }

  public async selectDirectoryFromDialog(): Promise<string | null> {
    if (isTauriEnvironment()) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Seleccionar Carpeta de Datos para La Palmera POS',
          defaultPath: this.currentConfig.baseDir,
        });

        if (typeof selected === 'string') {
          return selected;
        }
        return null;
      } catch (err) {
        console.error('[Storage] Error en diálogo de selección de carpeta:', err);
        return null;
      }
    } else {
      // En modo browser / prueba
      const promptPath = window.prompt(
        'Ingrese la ruta para almacenamiento de datos (ej. C:\\LaPalmera o D:\\LaPalmera):',
        this.currentConfig.baseDir
      );
      return promptPath ? promptPath.trim() : null;
    }
  }
}

export const storageService = StorageService.getInstance();
