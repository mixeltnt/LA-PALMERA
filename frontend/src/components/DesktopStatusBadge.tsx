import React, { useState, useEffect } from 'react';
import { syncService, SyncStatusInfo } from '../services/syncService';

export const DesktopStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusInfo>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    serverConnected: false,
    pendingCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
    lastError: null,
    counts: { products: 0, categories: 0, clients: 0, ventas: 0, compras: 0 },
  });

  useEffect(() => {
    const unsub = syncService.subscribe((s) => setStatus(s));
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    if (status.isSyncing) return;
    await syncService.triggerSync();
  };

  return (
    <div className="d-flex align-items-center gap-1 me-1 me-md-2">
      {/* Badge Principal: SQLite Local */}
      <div
        className="d-flex align-items-center gap-1 gap-md-2 px-2 px-md-3 py-1 rounded-pill shadow-sm"
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor: '#064e3b',
          color: '#ffffff',
          border: '1.5px solid #34d399',
          letterSpacing: '0.3px',
          userSelect: 'none',
        }}
        title={`Base de datos SQLite local activa y autónoma (${status.counts.products} productos, ${status.counts.ventas} ventas)`}
      >
        <span
          className="rounded-circle shadow-sm"
          style={{
            width: 8,
            height: 8,
            backgroundColor: '#10b981',
            boxShadow: '0 0 8px #10b981',
            display: 'inline-block',
          }}
        />
        <span className="d-none d-sm-inline" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
          SQLite Local
        </span>
      </div>

      {/* Badge de Sincronización en curso o Pendientes */}
      {status.isSyncing ? (
        <span
          className="badge bg-primary text-white px-2 py-1 fw-bold shadow-sm d-flex align-items-center gap-1"
          style={{ fontSize: '0.75rem' }}
          title="Sincronizando operaciones con PostgreSQL..."
        >
          <i className="bi bi-arrow-repeat spin-animation"></i>
          <span className="d-none d-md-inline">Sincronizando...</span>
        </span>
      ) : status.pendingCount > 0 ? (
        <button
          type="button"
          onClick={handleManualSync}
          className="btn btn-warning btn-sm px-2 py-0 fw-bold shadow-sm d-flex align-items-center gap-1"
          style={{ fontSize: '0.75rem', cursor: 'pointer', border: 'none' }}
          title={`${status.pendingCount} operaciones pendientes de sincronizar. Clic para sincronizar ahora.`}
        >
          <i className="bi bi-cloud-arrow-up-fill"></i>
          <span>{status.pendingCount}</span>
        </button>
      ) : status.lastSyncedAt ? (
        <span
          className="badge bg-dark bg-opacity-75 text-light px-2 py-1 fw-normal shadow-sm d-none d-lg-inline"
          style={{ fontSize: '0.70rem', border: '1px solid rgba(255,255,255,0.1)' }}
          title={`Última sincronización exitosa a las ${status.lastSyncedAt}`}
        >
          <i className="bi bi-cloud-check text-success me-1"></i>
          {status.lastSyncedAt}
        </span>
      ) : null}
    </div>
  );
};

export default DesktopStatusBadge;
