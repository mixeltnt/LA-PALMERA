import 'dotenv/config';
import { query } from '../src/config/postgres.js';

async function inspectUsuarios() {
  try {
    const cols = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      ORDER BY ordinal_position
    `);
    console.log('--- COLUMNAS EN TABLA USUARIOS ---');
    console.table(cols.rows);

    const users = await query(`
      SELECT id, sqlite_id, username, password_hash, nombre, apellido, rol, activo, email, creado_en 
      FROM usuarios
    `);
    console.log('\n--- USUARIOS EXISTENTES EN POSTGRESQL NEON ---');
    console.table(users.rows.map(u => ({
      id: u.id,
      sqlite_id: u.sqlite_id,
      username: u.username,
      password_hash_sample: u.password_hash ? u.password_hash.substring(0, 15) + '...' : null,
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo
    })));

    process.exit(0);
  } catch (err) {
    console.error('Error inspeccionando usuarios:', err);
    process.exit(1);
  }
}

inspectUsuarios();
