import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('database/lapalmera.db');
const tables = [
  'configuracion',
  'usuarios',
  'categorias',
  'proveedores',
  'productos',
  'clientes',
  'cliente_movimientos',
  'caja_sesiones',
  'caja_movimientos',
  'ventas',
  'venta_items',
  'venta_pagos',
  'compras',
  'compra_items',
  'inventario_movimientos',
  'respaldos',
  'sync_queue'
];

for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  console.log(`=== ${t} ===`);
  console.log(cols.map(c => `${c.name} (${c.type})`).join(', '));
}
