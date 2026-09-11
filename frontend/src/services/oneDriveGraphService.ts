// Servicio de OneDrive deshabilitado a favor de copias directas al Escritorio (La Palmera POS v12).
// Los respaldos se gestionan directamente a través de backupService hacia la carpeta Respaldos_LaPalmera en el Escritorio.

export interface OneDriveAuthState {
  isConnected: boolean;
  userEmail: string | null;
  userName: string | null;
  lastSyncAt: string | null;
}

export class OneDriveGraphService {
  private static instance: OneDriveGraphService;

  public static getInstance(): OneDriveGraphService {
    if (!OneDriveGraphService.instance) {
      OneDriveGraphService.instance = new OneDriveGraphService();
    }
    return OneDriveGraphService.instance;
  }

  public isConnected(): boolean {
    return false;
  }

  public getAuthState(): OneDriveAuthState {
    return {
      isConnected: false,
      userEmail: null,
      userName: null,
      lastSyncAt: null,
    };
  }

  public disconnect(): void {}
}

export const oneDriveGraphService = OneDriveGraphService.getInstance();
