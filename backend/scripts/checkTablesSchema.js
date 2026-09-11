import 'dotenv/config';
import { query } from '../src/config/postgres.js';

async function checkAllTables() {
  const tables = [
    'ventas', 'venta_items', 'venta_pagos',
    'productos', 'categorias', 'clientes', 'cliente_movimientos',
    'caja_sesiones', 'caja_movimientos'
  ];

  for (const t of tables) {
    const res = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [t]);
    console.log(`\n=== TABLA: ${t} ===`);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  }
  process.exit(0);
}

checkAllTables().catch(e => { console.error(e); process.exit(1); });
