// Repositorio SQLite Offline-First para Turnos y Movimientos de Caja
import { CashboxSession, CashMovement } from '../../types/cashbox';
import { dbManager } from '../db';
import { syncService } from '../../services/syncService';

export const cashboxRepository = {
  async getActiveSession(usuarioId?: string | number): Promise<CashboxSession | null> {
    const db = await dbManager.getConnection();
    let query = "SELECT * FROM caja_sesiones WHERE estado = 'abierta'";
    const params: any[] = [];
    if (usuarioId) {
      query += ' AND usuario_id = ?';
      params.push(Number(usuarioId));
    }
    query += ' ORDER BY id DESC LIMIT 1';

    const rows = await db.select<any>(query, params);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      usuarioId: r.usuario_id,
      usuarioNombre: r.usuario_nombre,
      fechaApertura: r.fecha_apertura,
      montoInicial: r.monto_inicial,
      fechaCierre: r.fecha_cierre,
      montoEsperadoEfectivo: r.monto_esperado_efectivo,
      montoRealEfectivo: r.monto_real_efectivo,
      diferencia: r.diferencia,
      totalVentasEfectivo: r.total_ventas_efectivo,
      totalVentasDebito: r.total_ventas_debito,
      totalVentasCredito: r.total_ventas_credito,
      totalVentasTransferencia: r.total_ventas_transferencia,
      totalIngresosExtra: r.total_ingresos_extra,
      totalEgresosExtra: r.total_egresos_extra,
      estado: r.estado,
      observaciones: r.observaciones,
    };
  },

  async openSession(usuarioId: string | number, usuarioNombre: string, montoInicial: number): Promise<CashboxSession> {
    const db = await dbManager.getConnection();
    const res = await db.execute(
      `INSERT INTO caja_sesiones (
        usuario_id, usuario_nombre, monto_inicial, estado, fecha_apertura
      ) VALUES (?, ?, ?, 'abierta', datetime('now', 'localtime'))`,
      [Number(usuarioId), usuarioNombre, montoInicial]
    );

    const sessionId = res.lastInsertId;

    // Registrar movimiento de apertura
    await db.execute(
      `INSERT INTO caja_movimientos (
        caja_sesion_id, tipo, monto, concepto, usuario_id, usuario_nombre
      ) VALUES (?, 'apertura', ?, 'Monto inicial de apertura de caja', ?, ?)`,
      [sessionId, montoInicial, Number(usuarioId), usuarioNombre]
    );

    const session = await this.getActiveSession(usuarioId);
    await syncService.enqueueChange('caja_sesiones', sessionId, 'INSERT', session);
    return session!;
  },

  async closeSession(sessionId: string | number, montoRealEfectivo: number, observaciones?: string): Promise<CashboxSession> {
    const db = await dbManager.getConnection();
    const sessionRows = await db.select<any>('SELECT * FROM caja_sesiones WHERE id = ?', [Number(sessionId)]);
    const current = sessionRows[0];

    const esperadoEfectivo = (current.monto_inicial || 0) +
      (current.total_ventas_efectivo || 0) +
      (current.total_ingresos_extra || 0) -
      (current.total_egresos_extra || 0);

    const diferencia = montoRealEfectivo - esperadoEfectivo;

    await db.execute(
      `UPDATE caja_sesiones SET
        estado = 'cerrada',
        fecha_cierre = datetime('now', 'localtime'),
        monto_esperado_efectivo = ?,
        monto_real_efectivo = ?,
        diferencia = ?,
        observaciones = ?
       WHERE id = ?`,
      [esperadoEfectivo, montoRealEfectivo, diferencia, observaciones || null, Number(sessionId)]
    );

    const updatedRows = await db.select<any>('SELECT * FROM caja_sesiones WHERE id = ?', [Number(sessionId)]);
    const r = updatedRows[0];
    const session: CashboxSession = {
      id: r.id,
      usuarioId: r.usuario_id,
      usuarioNombre: r.usuario_nombre,
      fechaApertura: r.fecha_apertura,
      montoInicial: r.monto_inicial,
      fechaCierre: r.fecha_cierre,
      montoEsperadoEfectivo: r.monto_esperado_efectivo,
      montoRealEfectivo: r.monto_real_efectivo,
      diferencia: r.diferencia,
      totalVentasEfectivo: r.total_ventas_efectivo,
      totalVentasDebito: r.total_ventas_debito,
      totalVentasCredito: r.total_ventas_credito,
      totalVentasTransferencia: r.total_ventas_transferencia,
      totalIngresosExtra: r.total_ingresos_extra,
      totalEgresosExtra: r.total_egresos_extra,
      estado: r.estado,
      observaciones: r.observaciones,
    };

    await syncService.enqueueChange('caja_sesiones', sessionId, 'UPDATE', session);
    return session;
  },

  async addMovement(sessionId: string | number, tipo: 'ingreso' | 'egreso', monto: number, concepto: string, usuarioId: string | number, usuarioNombre: string): Promise<CashMovement> {
    const db = await dbManager.getConnection();
    const res = await db.execute(
      `INSERT INTO caja_movimientos (
        caja_sesion_id, tipo, monto, concepto, usuario_id, usuario_nombre
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(sessionId), tipo, monto, concepto, Number(usuarioId), usuarioNombre]
    );

    const col = tipo === 'ingreso' ? 'total_ingresos_extra' : 'total_egresos_extra';
    await db.execute(`UPDATE caja_sesiones SET ${col} = ${col} + ? WHERE id = ?`, [monto, Number(sessionId)]);

    const mov: CashMovement = {
      id: res.lastInsertId,
      cajaSesionId: sessionId,
      tipo,
      monto,
      concepto,
      fecha: new Date().toISOString(),
      usuarioId,
      usuarioNombre,
    };

    await syncService.enqueueChange('caja_movimientos', res.lastInsertId, 'INSERT', mov).catch(() => {});

    return mov;
  },

  async getMovements(sessionId: string | number): Promise<CashMovement[]> {
    const db = await dbManager.getConnection();
    const rows = await db.select<any>(
      'SELECT * FROM caja_movimientos WHERE caja_sesion_id = ? ORDER BY id DESC',
      [Number(sessionId)]
    );
    return rows.map(r => ({
      id: r.id,
      cajaSesionId: r.caja_sesion_id,
      tipo: r.tipo,
      monto: Number(r.monto || 0),
      concepto: r.concepto,
      fecha: r.fecha,
      usuarioId: r.usuario_id,
      usuarioNombre: r.usuario_nombre,
    }));
  },

  async listSessions(limit: number = 20): Promise<CashboxSession[]> {
    const db = await dbManager.getConnection();
    const rows = await db.select<any>(
      'SELECT * FROM caja_sesiones ORDER BY id DESC LIMIT ?',
      [limit]
    );
    return rows.map(r => ({
      id: r.id,
      usuarioId: r.usuario_id,
      usuarioNombre: r.usuario_nombre,
      fechaApertura: r.fecha_apertura,
      montoInicial: Number(r.monto_inicial || 0),
      fechaCierre: r.fecha_cierre,
      montoEsperadoEfectivo: Number(r.monto_esperado_efectivo || 0),
      montoRealEfectivo: Number(r.monto_real_efectivo || 0),
      diferencia: Number(r.diferencia || 0),
      totalVentasEfectivo: Number(r.total_ventas_efectivo || 0),
      totalVentasDebito: Number(r.total_ventas_debito || 0),
      totalVentasCredito: Number(r.total_ventas_credito || 0),
      totalVentasTransferencia: Number(r.total_ventas_transferencia || 0),
      totalIngresosExtra: Number(r.total_ingresos_extra || 0),
      totalEgresosExtra: Number(r.total_egresos_extra || 0),
      estado: r.estado,
      observaciones: r.observaciones,
    }));
  }
};
