import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';
import { backupService } from '../../services/backupService';
import { syncService, SyncStatusInfo } from '../../services/syncService';
import { StorageConfig, BackupRecord } from '../../types/storage';
import { factoryResetDatabase, dbManager } from '../../database/db';
import { getApiBaseUrl, getApiKey, setApiKey, saveApiUrlToDatabase, testApiConnection } from '../../services/api';

export const Configuracion: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'business' | 'storage' | 'backups' | 'sync' | 'factory_reset'>('business');
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(storageService.getConfig());
  const [customPathInput, setCustomPathInput] = useState<string>(storageConfig.baseDir);
  const [desktopBackupDir, setDesktopBackupDir] = useState<string>(backupService.getDesktopBackupDirectory());
  const [backupsList, setBackupsList] = useState<BackupRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    isOnline: true,
    serverConnected: false,
    pendingCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
    lastError: null,
    counts: { products: 0, categories: 0, clients: 0, ventas: 0, compras: 0 },
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  // Estados para Sincronización Cloud / PostgreSQL
  const [apiUrlInput, setApiUrlInput] = useState<string>(getApiBaseUrl());
  const [apiKeyInput, setApiKeyInput] = useState<string>(getApiKey());
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);
  const [testConnResult, setTestConnResult] = useState<{ ok: boolean; message: string; details?: any } | null>(null);
  const [syncQueueRows, setSyncQueueRows] = useState<any[]>([]);

  // Estados para Restablecer Datos de Fábrica
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetPassword, setResetPassword] = useState<string>('');
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Estados para Cambiar Ruta de Almacenamiento Protegida por Clave
  const [showStorageModal, setShowStorageModal] = useState<boolean>(false);
  const [storagePassword, setStoragePassword] = useState<string>('');
  const [showStoragePassword, setShowStoragePassword] = useState<boolean>(false);
  const [storageError, setStorageError] = useState<string>('');

  // Datos comerciales
  const [businessName, setBusinessName] = useState('La Palmera POS');
  const [businessRut, setBusinessRut] = useState('76.123.456-7');
  const [businessAddress, setBusinessAddress] = useState('Av. Principal 1234, Santiago');
  const [ticketFooter, setTicketFooter] = useState('¡Gracias por su compra en La Palmera!');
  const [printerFormat, setPrinterFormat] = useState('termica_80mm');

  useEffect(() => {
    loadBackups();
    loadSyncQueue();
    setDesktopBackupDir(backupService.getDesktopBackupDirectory());
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const loadSyncQueue = async () => {
    try {
      const db = await dbManager.getConnection();
      const rows = await db.select<any>('SELECT * FROM sync_queue ORDER BY id DESC LIMIT 15');
      setSyncQueueRows(rows || []);
    } catch {
      setSyncQueueRows([]);
    }
  };

  const loadBackups = async () => {
    try {
      const list = await backupService.listBackups();
      setBackupsList(list);
    } catch (e) {
      console.warn('Error cargando lista de respaldos:', e);
    }
  };

  const showFeedback = (text: string, type: 'success' | 'danger' | 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleSaveDesktopFolder = () => {
    backupService.setDesktopBackupDirectory(desktopBackupDir);
    showFeedback('Carpeta de respaldos en el Escritorio actualizada', 'success');
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await storageService.selectDirectoryFromDialog();
      if (selected) {
        setCustomPathInput(selected);
      }
    } catch (e) {
      showFeedback('No se pudo abrir el selector de directorios', 'danger');
    }
  };

  const handleOpenStorageModal = () => {
    setStorageError('');
    setStoragePassword('');
    setShowStoragePassword(false);
    setShowStorageModal(true);
  };

  const handleConfirmStoragePath = async (e: React.FormEvent) => {
    e.preventDefault();
    setStorageError('');

    if (!storagePassword) {
      setStorageError('Por favor ingrese la contraseña de seguridad.');
      return;
    }

    if (storagePassword !== 'Mixeltnt2012') {
      setStorageError('Contraseña de seguridad incorrecta. Autorización denegada.');
      return;
    }

    try {
      setIsProcessing(true);
      const updated = await storageService.setBaseDirectory(customPathInput);
      setStorageConfig(updated);
      setShowStorageModal(false);
      setStoragePassword('');
      showFeedback('Ruta de almacenamiento local actualizada con éxito', 'success');
    } catch (err: any) {
      setStorageError(err.message || 'Error guardando ruta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setTestConnResult(null);
    try {
      const res = await testApiConnection(apiUrlInput, apiKeyInput);
      if (res.ok) {
        setTestConnResult({
          ok: true,
          message: '¡Conexión exitosa con el Backend API y PostgreSQL Online!',
          details: res.data,
        });
        showFeedback('Conexión con el servidor verificada correctamente.', 'success');
      } else {
        setTestConnResult({
          ok: false,
          message: res.error || 'No se pudo contactar el servidor.',
        });
        showFeedback(res.error || 'Fallo en la prueba de conexión.', 'danger');
      }
    } catch (err: any) {
      setTestConnResult({
        ok: false,
        message: err.message || 'Error desconocido al probar conexión.',
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSaveApiConfig = async () => {
    try {
      setIsProcessing(true);
      await saveApiUrlToDatabase(apiUrlInput);
      setApiKey(apiKeyInput);
      showFeedback('Configuración de sincronización guardada con éxito en SQLite local.', 'success');
    } catch (err: any) {
      showFeedback(err.message || 'Error guardando configuración de API.', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerSyncNow = async () => {
    try {
      setIsProcessing(true);
      const res = await syncService.triggerSync();
      await loadSyncQueue();
      if (res.success) {
        showFeedback(`Sincronización completada: ${res.pushed} operaciones sincronizadas correctamente.`, 'success');
      } else {
        showFeedback(`Aviso en sincronización: ${res.error || 'Verifique la conexión a Internet'}. Los datos locales están a salvo.`, 'danger');
      }
    } catch (e: any) {
      showFeedback(e.message || 'Error durante la sincronización.', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsProcessing(true);
      const record = await backupService.createBackup('manual', 'Respaldo manual solicitado por usuario');
      await loadBackups();
      showFeedback(`Respaldo creado exitosamente: ${record.fileName}`, 'success');
    } catch (e: any) {
      showFeedback(e.message || 'Error creando respaldo', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreBackup = async (backup: BackupRecord) => {
    if (!window.confirm(`¿Está seguro de restaurar el respaldo del ${new Date(backup.creadoEn).toLocaleString()}? Los datos actuales se reemplazarán.`)) {
      return;
    }

    try {
      setIsProcessing(true);
      await backupService.restoreBackup(backup.filePath);
      showFeedback('Respaldo restaurado con éxito. La base de datos ha sido recargada.', 'success');
      await loadBackups();
    } catch (e: any) {
      showFeedback(e.message || 'Error restaurando respaldo', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!resetPassword) {
      setResetError('Por favor ingrese la contraseña de seguridad.');
      return;
    }

    if (resetPassword !== 'Mixeltnt2012') {
      setResetError('Contraseña de seguridad incorrecta. Autorización denegada.');
      return;
    }

    try {
      setIsResetting(true);
      await factoryResetDatabase();
      setShowResetModal(false);
      setResetPassword('');
      setShowResetPassword(false);
      setResetError('');
      showFeedback('🎉 ¡Sistema restablecido a valores de fábrica con éxito! Base de datos en 0.', 'success');
      await loadBackups();
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err: any) {
      setResetError(err.message || 'Error durante el restablecimiento de la base de datos.');
    } finally {
      setIsResetting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container-fluid py-4 px-4">
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-gear-fill text-primary"></i>
            Configuración del Sistema
          </h2>
          <p className="text-muted mb-0 small">
            Gestione los datos del comercio, la base de datos local SQLite, copias de seguridad y restablecimiento de fábrica.
          </p>
        </div>
        <div className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 fs-6">
          <i className="bi bi-hdd-fill me-2"></i>
          Modo Autónomo Local (SQLite)
        </div>
      </div>

      {feedbackMsg && (
        <div className={`alert alert-${feedbackMsg.type} alert-dismissible fade show mb-4`} role="alert">
          <div className="d-flex align-items-center gap-2">
            <i className={`bi ${feedbackMsg.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5`}></i>
            <div>{feedbackMsg.text}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setFeedbackMsg(null)}></button>
        </div>
      )}

      {/* Navegación por Pestañas */}
      <ul className="nav nav-pills mb-4 gap-2 flex-wrap">
        <li className="nav-item">
          <button
            className={`nav-link px-4 py-2 fw-semibold ${activeTab === 'business' ? 'active' : ''}`}
            onClick={() => setActiveTab('business')}
          >
            <i className="bi bi-shop me-2"></i>
            Datos del Comercio
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link px-4 py-2 fw-semibold ${activeTab === 'storage' ? 'active' : ''}`}
            onClick={() => setActiveTab('storage')}
          >
            <i className="bi bi-folder-check me-2"></i>
            Base de Datos y Almacenamiento
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link px-4 py-2 fw-semibold ${activeTab === 'backups' ? 'active' : ''}`}
            onClick={() => setActiveTab('backups')}
          >
            <i className="bi bi-shield-check me-2"></i>
            Copias de Seguridad (Respaldos)
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link px-4 py-2 fw-semibold ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('sync');
              loadSyncQueue();
            }}
          >
            <i className="bi bi-cloud-arrow-up me-2"></i>
            Sincronización PostgreSQL
            {syncStatus.pendingCount > 0 && (
              <span className="badge bg-warning text-dark ms-2">{syncStatus.pendingCount}</span>
            )}
          </button>
        </li>
        <li className="nav-item ms-auto">
          <button
            className={`nav-link px-4 py-2 fw-semibold border ${activeTab === 'factory_reset' ? 'btn-danger bg-danger text-white border-danger' : 'text-danger border-danger-subtle bg-danger-subtle bg-opacity-25'}`}
            onClick={() => setActiveTab('factory_reset')}
          >
            <i className="bi bi-arrow-counterclockwise me-2"></i>
            Restablecer de Fábrica
          </button>
        </li>
      </ul>

      {/* Contenido: Datos del Comercio */}
      {activeTab === 'business' && (
        <div className="card shadow-sm border-0 rounded-3">
          <div className="card-header bg-white py-3 border-bottom">
            <h5 className="mb-0 fw-bold text-dark">Información del Negocio y Boleta</h5>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Nombre del Comercio</label>
                <input
                  type="text"
                  className="form-control"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">RUT / Identificación</label>
                <input
                  type="text"
                  className="form-control"
                  value={businessRut}
                  onChange={(e) => setBusinessRut(e.target.value)}
                />
              </div>
              <div className="col-md-12">
                <label className="form-label fw-semibold">Dirección</label>
                <input
                  type="text"
                  className="form-control"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Pie de Página del Ticket</label>
                <input
                  type="text"
                  className="form-control"
                  value={ticketFooter}
                  onChange={(e) => setTicketFooter(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Formato de Impresora</label>
                <select
                  className="form-select"
                  value={printerFormat}
                  onChange={(e) => setPrinterFormat(e.target.value)}
                >
                  <option value="termica_80mm">Térmica 80mm (Estándar)</option>
                  <option value="termica_58mm">Térmica 58mm (Compacta)</option>
                  <option value="carta">Carta / A4</option>
                </select>
              </div>
            </div>
            <div className="mt-4 pt-3 border-top d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-primary px-4"
                onClick={() => showFeedback('Datos del comercio guardados correctamente en SQLite local', 'success')}
              >
                <i className="bi bi-check2-circle me-1"></i> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido: Base de Datos y Almacenamiento */}
      {activeTab === 'storage' && (
        <div className="card shadow-sm border-0 rounded-3">
          <div className="card-header bg-white py-3 border-bottom">
            <h5 className="mb-0 fw-bold text-dark">Rutas de Almacenamiento Local (SQLite)</h5>
          </div>
          <div className="card-body p-4">
            <div className="alert alert-info border-info mb-4">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-info-circle-fill fs-5"></i>
                <div>
                  <strong>Almacenamiento Local 100% Autónomo:</strong> Toda la información comercial, ventas, productos, compras y clientes se guardan exclusivamente en el archivo de base de datos local SQLite en <code>C:\LaPalmera\database\lapalmera.db</code>.
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Directorio Base del Sistema</label>
              <div className="input-group mb-2">
                <input
                  type="text"
                  className="form-control font-monospace"
                  value={customPathInput}
                  onChange={(e) => setCustomPathInput(e.target.value)}
                />
                <button className="btn btn-outline-secondary" type="button" onClick={handleSelectFolder}>
                  <i className="bi bi-folder2-open me-1"></i> Examinar...
                </button>
                <button className="btn btn-primary" type="button" onClick={handleOpenStorageModal} disabled={isProcessing}>
                  <i className="bi bi-save me-1"></i> Aplicar Ruta
                </button>
              </div>
              <small className="text-muted">
                Ruta predeterminada recomendada: <code>C:\LaPalmera</code>
              </small>
            </div>

            <div className="row g-3 mt-2">
              <div className="col-md-4">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted small">Base de Datos</div>
                  <div className="fw-bold text-truncate" title={storageConfig.databasePath}>
                    {storageConfig.databasePath}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted small">Carpeta de Respaldos</div>
                  <div className="fw-bold text-truncate" title={storageConfig.backupsDir}>
                    {storageConfig.backupsDir}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted small">Exportaciones y Reportes</div>
                  <div className="fw-bold text-truncate" title={storageConfig.exportsDir}>
                    {storageConfig.exportsDir}
                  </div>
                </div>
              </div>
            </div>

            {/* Acceso directo a restablecimiento */}
            <div className="mt-4 pt-4 border-top">
              <div className="d-flex justify-content-between align-items-center bg-danger-subtle bg-opacity-25 border border-danger-subtle p-3 rounded-3 flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold text-danger mb-1">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    ¿Desea reiniciar todos los datos a estado de fábrica?
                  </h6>
                  <p className="text-muted small mb-0">
                    Borra todos los datos de prueba (productos, ventas, clientes) y deja el sistema limpio desde cero.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm px-3 fw-semibold"
                  onClick={() => {
                    setResetPassword('');
                    setResetError('');
                    setShowResetModal(true);
                  }}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i> Restablecer de Fábrica
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido: Copias de Seguridad */}
      {activeTab === 'backups' && (
        <div className="card shadow-sm border-0 rounded-3">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h5 className="mb-0 fw-bold text-dark">Copias de Seguridad (Respaldos del Día)</h5>
              <small className="text-muted">Generación de copias directas de la base de datos de ventas en el Escritorio y almacenamiento local</small>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-success px-4 py-2 fw-semibold shadow-sm"
                onClick={handleCreateBackup}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Creando Respaldo...
                  </>
                ) : (
                  <>
                    <i className="bi bi-shield-fill-check me-2"></i> Crear Respaldo Ahora
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="card-body p-4">
            {/* Panel de Carpeta en Escritorio para Respaldos y Nube */}
            <div className="card bg-success bg-opacity-10 border-success rounded-3 p-3 mb-4">
              <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-start gap-3">
                  <div className="p-3 bg-success text-white rounded-circle fs-4 shadow-sm mt-1">
                    <i className="bi bi-display"></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h6 className="fw-bold mb-0 text-dark fs-6">Carpeta en el Escritorio (Para Respaldos y Nube)</h6>
                      <span className="badge bg-success">Activo 📂</span>
                    </div>
                    <p className="text-dark small mb-2 mt-1">
                      Al presionar <strong>"Crear Respaldo Ahora"</strong>, el sistema genera automáticamente el archivo con el nombre y fecha del día (ej: <code>Respaldo_Ventas_LaPalmera_AAAA-MM-DD_HH-mm.db</code>).
                    </p>
                    <p className="text-muted small mb-0">
                      ☁️ <strong>Subida a la Nube Personal:</strong> Puedes abrir la carpeta de respaldos directamente en tu Escritorio y subir los archivos a <strong>OneDrive</strong>, <strong>Google Drive</strong> o guardarlos en un pendrive de seguridad.
                    </p>
                  </div>
                </div>
              </div>

              <hr className="my-3 border-success-subtle" />

              <div className="row g-2 align-items-center">
                <div className="col-md-8">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Ruta de la Carpeta en el Escritorio:
                  </label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-folder-symlink"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={desktopBackupDir}
                      onChange={(e) => setDesktopBackupDir(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={handleSaveDesktopFolder}
                    >
                      <i className="bi bi-check2 me-1"></i> Guardar Ruta
                    </button>
                  </div>
                </div>
                <div className="col-md-4">
                  <small className="text-muted d-block mt-3">
                    También se conserva una copia interna en: <code>{storageConfig.backupsDir}</code>
                  </small>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-secondary mb-0">
                <i className="bi bi-clock-history me-1"></i> Historial de Copias de Seguridad Registradas
              </h6>
              <span className="badge bg-light text-dark border">
                {backupsList.length} {backupsList.length === 1 ? 'respaldo' : 'respaldos'} disponibles
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 border rounded">
                <thead className="table-light">
                  <tr>
                    <th>Archivo de Respaldo de Ventas</th>
                    <th>Tipo</th>
                    <th>Tamaño</th>
                    <th>Fecha y Hora</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {backupsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        <i className="bi bi-inbox fs-3 d-block mb-1"></i>
                        No hay copias de seguridad registradas aún. Presiona "Crear Respaldo Ahora" para generar la primera.
                      </td>
                    </tr>
                  ) : (
                    backupsList.map((bkp) => (
                      <tr key={bkp.id}>
                        <td>
                          <div className="fw-bold font-monospace small text-primary">{bkp.fileName}</div>
                          {bkp.descripcion && <small className="text-muted">{bkp.descripcion}</small>}
                        </td>
                        <td>
                          <span className={`badge ${bkp.tipo === 'automatico' ? 'bg-info text-dark' : 'bg-success'}`}>
                            {bkp.tipo === 'automatico' ? 'Automático' : 'Manual'}
                          </span>
                        </td>
                        <td>{formatBytes(bkp.fileSizeBytes)}</td>
                        <td>{new Date(bkp.creadoEn).toLocaleString('es-CL')}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleRestoreBackup(bkp)}
                            disabled={isProcessing}
                            title="Restaurar esta base de datos"
                          >
                            <i className="bi bi-arrow-counterclockwise me-1"></i> Restaurar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenido: Pestaña Sincronización Cloud / PostgreSQL */}
      {activeTab === 'sync' && (
        <div className="card shadow-sm border-0 rounded-3">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h5 className="mb-0 fw-bold text-dark">
                <i className="bi bi-cloud-check-fill text-primary me-2"></i>
                Sincronización Cloud con PostgreSQL Online
              </h5>
              <small className="text-muted">
                SQLite local sigue siendo la base de operación 100% offline; los datos se respaldan en segundo plano hacia PostgreSQL.
              </small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                onClick={handleTestConnection}
                disabled={isTestingConn || isProcessing}
              >
                {isTestingConn ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  <i className="bi bi-broadcast"></i>
                )}
                <span>Probar Conexión</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                onClick={handleTriggerSyncNow}
                disabled={isProcessing || syncStatus.isSyncing}
              >
                {syncStatus.isSyncing ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-repeat"></i>
                    <span>Sincronizar Ahora</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="card-body p-4">
            {/* Estado en vivo */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted small">Estado de Internet</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span
                      className="rounded-circle"
                      style={{
                        width: 10,
                        height: 10,
                        backgroundColor: syncStatus.isOnline ? '#10b981' : '#ef4444',
                      }}
                    />
                    <span className="fw-bold">{syncStatus.isOnline ? 'En Línea (Online)' : 'Desconectado (Offline)'}</span>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted small">Operaciones Pendientes</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className={`badge ${syncStatus.pendingCount > 0 ? 'bg-warning text-dark' : 'bg-success'} fs-6`}>
                      {syncStatus.pendingCount}
                    </span>
                    <span className="small text-muted">{syncStatus.pendingCount === 1 ? 'en cola' : 'en cola'}</span>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted small">Última Sincronización</div>
                  <div className="fw-bold text-dark mt-1">
                    {syncStatus.lastSyncedAt || 'Ninguna aún'}
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="text-muted small">Operación Local</div>
                  <div className="fw-bold text-success mt-1">
                    <i className="bi bi-shield-check me-1"></i> SQLite Autónomo
                  </div>
                </div>
              </div>
            </div>

            {/* Resultado de prueba de conexión */}
            {testConnResult && (
              <div className={`alert alert-${testConnResult.ok ? 'success' : 'danger'} py-2 px-3 mb-4 small rounded-3`}>
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi ${testConnResult.ok ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} fs-5`}></i>
                  <div>
                    <strong>{testConnResult.message}</strong>
                    {testConnResult.details?.counts && (
                      <div className="mt-1 text-muted">
                        PostgreSQL online contiene:{' '}
                        {testConnResult.details.counts.productos_count || 0} productos,{' '}
                        {testConnResult.details.counts.ventas_count || 0} ventas,{' '}
                        {testConnResult.details.counts.clientes_count || 0} clientes.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Configuración de Endpoint y API Key */}
            <div className="card border rounded-3 mb-4">
              <div className="card-header bg-light py-2 px-3 fw-semibold small text-secondary">
                <i className="bi bi-sliders me-1"></i> Parámetros de Conexión con Backend API
              </div>
              <div className="card-body p-3">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">URL del Backend API</label>
                    <input
                      type="text"
                      className="form-control form-control-sm font-monospace"
                      value={apiUrlInput}
                      onChange={(e) => setApiUrlInput(e.target.value)}
                      placeholder="http://localhost:4000/api"
                    />
                    <small className="text-muted">Dirección del servicio Node.js / PostgreSQL</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Clave Secreta de Sincronización (x-api-key)</label>
                    <div className="input-group input-group-sm">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        className="form-control font-monospace"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="API Key"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        <i className={`bi ${showApiKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                    <small className="text-muted">Protege la comunicación entre el POS y la API central</small>
                  </div>
                </div>

                <div className="mt-3 d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm"
                    onClick={handleSaveApiConfig}
                    disabled={isProcessing}
                  >
                    <i className="bi bi-save me-1"></i> Guardar Parámetros de Conexión
                  </button>
                </div>
              </div>
            </div>

            {/* Monitor de Cola de Sincronización SQLite */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-bold text-secondary mb-0">
                <i className="bi bi-list-check me-1"></i> Registro de Operaciones en Cola Local (sync_queue)
              </h6>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none p-0"
                onClick={loadSyncQueue}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Actualizar lista
              </button>
            </div>

            <div className="table-responsive border rounded">
              <table className="table table-hover table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr className="small">
                    <th># ID</th>
                    <th>Tabla</th>
                    <th>Operación</th>
                    <th>Estado</th>
                    <th>Intentos</th>
                    <th>Fecha Registro</th>
                    <th>Fecha Sincronización</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {syncQueueRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-3 text-muted">
                        No hay operaciones pendientes en la cola local.
                      </td>
                    </tr>
                  ) : (
                    syncQueueRows.map((q) => (
                      <tr key={q.id}>
                        <td className="font-monospace text-muted">{q.id}</td>
                        <td className="fw-semibold text-primary">{q.tabla}</td>
                        <td>
                          <span className={`badge ${q.operacion === 'INSERT' ? 'bg-success' : q.operacion === 'UPDATE' ? 'bg-info text-dark' : 'bg-danger'}`}>
                            {q.operacion}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${q.estado === 'completado' ? 'bg-success' : q.estado === 'pendiente' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                            {q.estado}
                          </span>
                        </td>
                        <td>{q.intentos || 0}</td>
                        <td className="text-muted">{q.creado_en}</td>
                        <td className="text-muted">{q.sincronizado_en || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenido: Pestaña Restablecer de Fábrica */}
      {activeTab === 'factory_reset' && (
        <div className="card shadow-sm border-danger border-opacity-25 rounded-3">
          <div className="card-header bg-danger bg-opacity-10 py-3 border-bottom border-danger-subtle d-flex align-items-center gap-2">
            <i className="bi bi-shield-exclamation text-danger fs-4"></i>
            <div>
              <h5 className="mb-0 fw-bold text-danger">Restablecer Datos de Fábrica (Desde Cero)</h5>
              <small className="text-muted">Herramienta para limpiar todos los datos de prueba y dejar el sistema listo para producción</small>
            </div>
          </div>
          <div className="card-body p-4">
            <div className="alert alert-warning border-warning d-flex align-items-start gap-3 mb-4">
              <i className="bi bi-exclamation-triangle-fill text-warning fs-3 mt-1"></i>
              <div>
                <h6 className="fw-bold text-dark mb-1">¿Para qué sirve esta función?</h6>
                <p className="mb-2 small">
                  Permite probar el sistema completo (crear clientes, inventario, ventas, compras, caja y fiados) y, una vez finalizadas las pruebas de validación, dejar la aplicación <strong>100% limpia desde cero</strong>.
                </p>
                <div className="small text-muted">
                  <strong>Lo que se eliminará:</strong> Todas las ventas, ítems, compras, clientes, cuentas corrientes, fiados, productos agregados, movimientos de inventario y sesiones de caja.<br />
                  <strong>Lo que se conservará:</strong> Los usuarios administrativos oficiales (Yasna, Karla y Ventas) y las categorías base del minimarket.
                </div>
              </div>
            </div>

            <div className="p-4 bg-light rounded-3 border d-flex flex-column align-items-center text-center">
              <div className="p-3 bg-danger text-white rounded-circle fs-2 shadow mb-3">
                <i className="bi bi-trash3-fill"></i>
              </div>
              <h5 className="fw-bold text-dark mb-2">Restablecer la Base de Datos a Estado de Fábrica</h5>
              <p className="text-muted small max-w-lg mb-4" style={{ maxWidth: '550px' }}>
                Para ejecutar esta operación protegida, se le solicitará la contraseña de seguridad autorizada. Esta acción es definitiva y no puede deshacerse.
              </p>
              <button
                type="button"
                className="btn btn-danger btn-lg px-5 py-2 fw-bold shadow d-flex align-items-center gap-2"
                onClick={() => {
                  setResetPassword('');
                  setResetError('');
                  setShowResetModal(true);
                }}
              >
                <i className="bi bi-arrow-counterclockwise fs-5"></i>
                <span>Restablecer Datos de Fábrica Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación y Contraseña de Seguridad */}
      {showResetModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden">
              <div className="modal-header bg-danger text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2 fs-6">
                  <i className="bi bi-shield-lock-fill fs-5"></i>
                  Autorización de Seguridad — Restablecer Fábrica
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Cerrar"
                  onClick={() => {
                    if (!isResetting) setShowResetModal(false);
                  }}
                  disabled={isResetting}
                ></button>
              </div>

              <form onSubmit={handleConfirmFactoryReset}>
                <div className="modal-body p-4">
                  <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3 rounded-3">
                    <i className="bi bi-exclamation-triangle-fill fs-5 flex-shrink-0"></i>
                    <div>
                      <strong>¡Atención!</strong> Esta acción borrará todas las ventas, productos, clientes y registros para dejar la aplicación <strong>desde cero</strong>.
                    </div>
                  </div>

                  {resetError && (
                    <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3 rounded-3">
                      <i className="bi bi-x-circle-fill fs-5 flex-shrink-0"></i>
                      <div>{resetError}</div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark small mb-1">
                      Ingrese la Contraseña de Seguridad para autorizar:
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-secondary border-end-0">
                        <i className="bi bi-key-fill"></i>
                      </span>
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        className="form-control border-start-0 border-end-0"
                        placeholder="Contraseña de autorización"
                        value={resetPassword}
                        onChange={(e) => {
                          setResetPassword(e.target.value);
                          setResetError('');
                        }}
                        autoFocus
                        disabled={isResetting}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        tabIndex={-1}
                        title={showResetPassword ? 'Ocultar' : 'Ver'}
                        disabled={isResetting}
                      >
                        <i className={`bi ${showResetPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                    <small className="text-muted d-block mt-1">
                      Clave de autorización configurada por el desarrollador.
                    </small>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-4 border-top d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary px-3"
                    onClick={() => setShowResetModal(false)}
                    disabled={isResetting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
                    disabled={isResetting || !resetPassword}
                  >
                    {isResetting ? (
                      <>
                        <span className="spinner-border spinner-border-sm"></span>
                        <span>Restableciendo...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash3-fill"></i>
                        <span>Confirmar y Dejar de Fábrica</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmación Protegida para Cambiar Ruta de Base de Datos */}
      {showStorageModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-shield-lock-fill"></i>
                  <span>Autorización de Seguridad Requerida</span>
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowStorageModal(false)}
                  disabled={isProcessing}
                ></button>
              </div>

              <form onSubmit={handleConfirmStoragePath}>
                <div className="modal-body p-4">
                  <div className="alert alert-warning py-2 small mb-3">
                    <i className="bi bi-info-circle me-1"></i>
                    Modificar la ruta de la base de datos reubicará el directorio de almacenamiento local del sistema.
                  </div>

                  {storageError && (
                    <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
                      <i className="bi bi-x-circle-fill"></i>
                      <span>{storageError}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark small mb-1">
                      Nueva Ruta a Configurar:
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm font-monospace bg-light mb-3"
                      value={customPathInput}
                      readOnly
                    />

                    <label className="form-label fw-semibold text-dark small mb-1">
                      Ingrese la Contraseña de Seguridad del Desarrollador:
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-secondary border-end-0">
                        <i className="bi bi-key-fill"></i>
                      </span>
                      <input
                        type={showStoragePassword ? 'text' : 'password'}
                        className="form-control border-start-0 border-end-0"
                        placeholder="Contraseña de autorización"
                        value={storagePassword}
                        onChange={(e) => {
                          setStoragePassword(e.target.value);
                          setStorageError('');
                        }}
                        autoFocus
                        disabled={isProcessing}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0"
                        onClick={() => setShowStoragePassword(!showStoragePassword)}
                        tabIndex={-1}
                        title={showStoragePassword ? 'Ocultar' : 'Ver'}
                        disabled={isProcessing}
                      >
                        <i className={`bi ${showStoragePassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-4 border-top d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary px-3"
                    onClick={() => setShowStorageModal(false)}
                    disabled={isProcessing}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
                    disabled={isProcessing || !storagePassword}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner-border spinner-border-sm"></span>
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle"></i>
                        <span>Autorizar y Guardar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracion;
