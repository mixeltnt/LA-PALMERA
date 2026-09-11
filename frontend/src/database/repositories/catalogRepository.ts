// Repositorio SQLite Offline-First para Categorías, Clientes y Proveedores
import { Category } from '../../types/product';
import { Customer, Supplier } from '../../types/customer';
import { dbManager } from '../db';
import { syncService } from '../../services/syncService';

export const categoryRepository = {
  async list(): Promise<Category[]> {
    const db = await dbManager.getConnection();
    const rows = await db.select<any>('SELECT * FROM categorias WHERE activo = 1 ORDER BY nombre ASC');
    return rows.map(r => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      color: r.color,
      icono: r.icono,
      activo: Boolean(r.activo),
    }));
  },

  async create(data: Partial<Category>): Promise<Category> {
    const db = await dbManager.getConnection();
    const res = await db.execute(
      'INSERT INTO categorias (nombre, descripcion, color, icono) VALUES (?, ?, ?, ?)',
      [data.nombre, data.descripcion || null, data.color || '#2563eb', data.icono || 'bi-tag']
    );
    const cat: Category = {
      id: res.lastInsertId,
      nombre: data.nombre!,
      descripcion: data.descripcion,
      color: data.color || '#2563eb',
      icono: data.icono || 'bi-tag',
      activo: true,
    };
    await syncService.enqueueChange('categorias', res.lastInsertId, 'INSERT', cat);
    return cat;
  },

  async update(id: string | number, data: Partial<Category>): Promise<Category> {
    const db = await dbManager.getConnection();
    await db.execute(
      'UPDATE categorias SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion), color = COALESCE(?, color), icono = COALESCE(?, icono) WHERE id = ?',
      [data.nombre, data.descripcion, data.color, data.icono, Number(id)]
    );
    const cat: Category = {
      id,
      nombre: data.nombre || '',
      descripcion: data.descripcion,
      color: data.color,
      icono: data.icono,
      activo: true,
    };
    await syncService.enqueueChange('categorias', id, 'UPDATE', cat);
    return cat;
  },

  async delete(id: string | number): Promise<boolean> {
    const db = await dbManager.getConnection();
    await db.execute('UPDATE categorias SET activo = 0 WHERE id = ?', [Number(id)]);
    await syncService.enqueueChange('categorias', id, 'DELETE', { id });
    return true;
  }
};

export const customerRepository = {
  async list(search?: string, filterActivo?: string): Promise<any[]> {
    const db = await dbManager.getConnection();
    let query = 'SELECT * FROM clientes WHERE 1=1';
    const params: any[] = [];
    if (filterActivo === 'true') {
      query += ' AND activo = 1';
    } else if (filterActivo === 'false') {
      query += ' AND activo = 0';
    }
    if (search) {
      query += ' AND (nombre LIKE ? OR rut LIKE ? OR telefono LIKE ?)';
      const t = `%${search}%`;
      params.push(t, t, t);
    }
    query += ' ORDER BY nombre ASC';
    const rows = await db.select<any>(query, params);
    return rows.map(r => ({
      id: r.id,
      _id: String(r.id),
      rut: r.rut || '',
      nombre: r.nombre,
      telefono: r.telefono || '',
      email: r.email || '',
      direccion: r.direccion || '',
      ciudad: r.ciudad || '',
      comuna: r.ciudad || '',
      limiteCredito: Number(r.limite_credito || 0),
      limiteFiado: Number(r.limite_credito || 0),
      saldoDeudor: Number(r.saldo_deudor || 0),
      saldoPendiente: Number(r.saldo_deudor || 0),
      activo: Boolean(r.activo),
      creadoEn: r.creado_en,
    }));
  },

  async getById(id: string | number): Promise<any | null> {
    const db = await dbManager.getConnection();
    const rows = await db.select<any>('SELECT * FROM clientes WHERE id = ?', [Number(id)]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      _id: String(r.id),
      rut: r.rut || '',
      nombre: r.nombre,
      telefono: r.telefono || '',
      email: r.email || '',
      direccion: r.direccion || '',
      ciudad: r.ciudad || '',
      comuna: r.ciudad || '',
      limiteCredito: Number(r.limite_credito || 0),
      limiteFiado: Number(r.limite_credito || 0),
      saldoDeudor: Number(r.saldo_deudor || 0),
      saldoPendiente: Number(r.saldo_deudor || 0),
      activo: Boolean(r.activo),
      creadoEn: r.creado_en,
    };
  },

  async create(data: any): Promise<any> {
    const db = await dbManager.getConnection();
    const limite = Number(data.limiteFiado ?? data.limiteCredito ?? 0) || 0;
    const saldo = Number(data.saldoDeudor ?? data.saldoPendiente ?? 0) || 0;
    const res = await db.execute(
      `INSERT INTO clientes (rut, nombre, telefono, email, direccion, ciudad, limite_credito, saldo_deudor, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.rut || null,
        data.nombre,
        data.telefono || null,
        data.email || null,
        data.direccion || null,
        data.comuna || data.ciudad || null,
        limite,
        saldo,
        data.activo !== false ? 1 : 0,
      ]
    );
    const cust = {
      id: res.lastInsertId,
      _id: String(res.lastInsertId),
      rut: data.rut || '',
      nombre: data.nombre,
      telefono: data.telefono || '',
      email: data.email || '',
      direccion: data.direccion || '',
      ciudad: data.comuna || data.ciudad || '',
      comuna: data.comuna || data.ciudad || '',
      limiteCredito: limite,
      limiteFiado: limite,
      saldoDeudor: saldo,
      saldoPendiente: saldo,
      activo: data.activo !== false,
      creadoEn: new Date().toISOString(),
    };
    await syncService.enqueueChange('clientes', res.lastInsertId, 'INSERT', cust).catch(() => {});
    return cust;
  },

  async update(id: string | number, data: any): Promise<any> {
    const db = await dbManager.getConnection();
    const limite = Number(data.limiteFiado ?? data.limiteCredito ?? 0) || 0;
    await db.execute(
      `UPDATE clientes SET 
        rut = ?,
        nombre = ?,
        telefono = ?,
        email = ?,
        direccion = ?,
        ciudad = ?,
        limite_credito = ?,
        activo = ?
       WHERE id = ?`,
      [
        data.rut || null,
        data.nombre,
        data.telefono || null,
        data.email || null,
        data.direccion || null,
        data.comuna || data.ciudad || null,
        limite,
        data.activo !== false ? 1 : 0,
        Number(id),
      ]
    );
    const updated = await this.getById(id);
    await syncService.enqueueChange('clientes', id, 'UPDATE', updated).catch(() => {});
    return updated;
  },

  async delete(id: string | number): Promise<boolean> {
    const db = await dbManager.getConnection();
    await db.execute('DELETE FROM clientes WHERE id = ?', [Number(id)]);
    await syncService.enqueueChange('clientes', id, 'DELETE', { id }).catch(() => {});
    return true;
  },

  async getMovimientos(clienteId: string | number): Promise<any[]> {
    const db = await dbManager.getConnection();
    const rows = await db.select<any>(
      `SELECT m.*, v.folio as venta_folio, v.numero_boleta 
       FROM cliente_movimientos m 
       LEFT JOIN ventas v ON m.venta_id = v.id 
       WHERE m.cliente_id = ? 
       ORDER BY m.id DESC`,
      [Number(clienteId)]
    );
    return rows.map(r => ({
      _id: String(r.id),
      id: r.id,
      clienteId: r.cliente_id,
      tipoMovimiento: r.tipo_movimiento,
      monto: Number(r.monto || 0),
      saldoResultante: Number(r.saldo_resultante || 0),
      observacion: r.observacion,
      venta: r.venta_id ? { numeroVenta: r.venta_folio || r.venta_id } : null,
      fecha: r.fecha,
      estado: r.estado || 'ACTIVO',
    }));
  },

  async registrarAbono(id: string | number, monto: number, observacion?: string): Promise<boolean> {
    const db = await dbManager.getConnection();
    const cId = Number(id);
    const m = Number(monto) || 0;
    await db.execute(
      'UPDATE clientes SET saldo_deudor = MAX(0, saldo_deudor - ?) WHERE id = ?',
      [m, cId]
    );
    const custRows = await db.select<any>('SELECT saldo_deudor FROM clientes WHERE id = ?', [cId]);
    const newSaldo = custRows[0]?.saldo_deudor ?? 0;
    const res = await db.execute(
      `INSERT INTO cliente_movimientos (
        cliente_id, tipo_movimiento, monto, saldo_resultante, observacion, fecha
      ) VALUES (?, 'ABONO', ?, ?, ?, datetime('now', 'localtime'))`,
      [
        cId,
        m,
        Number(newSaldo),
        observacion || 'Abono a cuenta corriente'
      ]
    ).catch(e => {
      console.warn('[customerRepository] Error registrando movimiento de abono:', e);
      return { lastInsertId: 0, rowsAffected: 0 };
    });

    // Encolar movimiento de abono
    await syncService.enqueueChange('cliente_movimientos', res.lastInsertId || cId, 'INSERT', {
      cliente_id: cId,
      tipo_movimiento: 'ABONO',
      monto: m,
      saldo_resultante: Number(newSaldo),
      observacion: observacion || 'Abono a cuenta corriente',
      fecha: new Date().toISOString(),
    }).catch(() => {});

    // Encolar actualización de saldo del cliente
    const updatedClient = await this.getById(cId);
    if (updatedClient) {
      await syncService.enqueueChange('clientes', cId, 'UPDATE', updatedClient).catch(() => {});
    }

    return true;
  }
};

export const supplierRepository = {
  async list(search?: string, filterActivo?: string): Promise<Supplier[]> {
    const db = await dbManager.getConnection();
    let query = 'SELECT * FROM proveedores WHERE 1=1';
    const params: any[] = [];
    if (filterActivo === 'true') {
      query += ' AND activo = 1';
    } else if (filterActivo === 'false') {
      query += ' AND activo = 0';
    }
    if (search) {
      query += ' AND (nombre LIKE ? OR rut LIKE ? OR contacto LIKE ?)';
      const t = `%${search}%`;
      params.push(t, t, t);
    }
    query += ' ORDER BY nombre ASC';
    const rows = await db.select<any>(query, params);
    return rows.map(r => ({
      id: r.id,
      rut: r.rut || '',
      nombre: r.nombre,
      contacto: r.contacto || '',
      telefono: r.telefono || '',
      email: r.email || '',
      direccion: r.direccion || '',
      activo: Boolean(r.activo),
      creadoEn: r.creado_en,
    }));
  },

  async getById(id: string | number): Promise<Supplier | null> {
    const db = await dbManager.getConnection();
    const rows = await db.select<any>('SELECT * FROM proveedores WHERE id = ? LIMIT 1', [Number(id)]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      rut: r.rut || '',
      nombre: r.nombre,
      contacto: r.contacto || '',
      telefono: r.telefono || '',
      email: r.email || '',
      direccion: r.direccion || '',
      activo: Boolean(r.activo),
      creadoEn: r.creado_en,
    };
  },

  async create(data: Partial<Supplier>): Promise<Supplier> {
    const db = await dbManager.getConnection();
    const res = await db.execute(
      `INSERT INTO proveedores (rut, nombre, contacto, telefono, email, direccion, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.rut || null,
        data.nombre || 'Proveedor',
        data.contacto || null,
        data.telefono || null,
        data.email || null,
        data.direccion || null,
        data.activo !== false ? 1 : 0,
      ]
    );
    const newId = res.lastInsertId;
    const prov: Supplier = {
      id: newId,
      rut: data.rut || '',
      nombre: data.nombre || 'Proveedor',
      contacto: data.contacto || '',
      telefono: data.telefono || '',
      email: data.email || '',
      direccion: data.direccion || '',
      activo: data.activo !== false,
      creadoEn: new Date().toISOString(),
    };
    await syncService.enqueueChange('proveedores', newId, 'INSERT', prov).catch(() => {});
    return prov;
  },

  async update(id: string | number, data: Partial<Supplier>): Promise<Supplier> {
    const db = await dbManager.getConnection();
    const numId = Number(id);
    await db.execute(
      `UPDATE proveedores SET 
        rut = COALESCE(?, rut),
        nombre = COALESCE(?, nombre),
        contacto = COALESCE(?, contacto),
        telefono = COALESCE(?, telefono),
        email = COALESCE(?, email),
        direccion = COALESCE(?, direccion),
        activo = COALESCE(?, activo)
       WHERE id = ?`,
      [
        data.rut,
        data.nombre,
        data.contacto,
        data.telefono,
        data.email,
        data.direccion,
        data.activo !== undefined ? (data.activo ? 1 : 0) : null,
        numId,
      ]
    );
    const updated = await this.getById(numId);
    await syncService.enqueueChange('proveedores', numId, 'UPDATE', updated).catch(() => {});
    return updated!;
  },

  async delete(id: string | number): Promise<boolean> {
    const db = await dbManager.getConnection();
    const numId = Number(id);
    await db.execute('UPDATE compras SET proveedor_id = NULL WHERE proveedor_id = ?', [numId]).catch(() => {});
    const res = await db.execute('DELETE FROM proveedores WHERE id = ?', [numId]);
    await syncService.enqueueChange('proveedores', numId, 'DELETE', { id: numId }).catch(() => {});
    return res.rowsAffected > 0;
  }
};
