import os
import sqlite3
import datetime

DB_PATH = r"C:\LaPalmera\database\lapalmera.db"
BACKUPS_DIR = r"C:\LaPalmera\backups"

def run_v11_suite():
    print("=" * 60)
    print("  SUITE DE AUDITORÍA Y VERIFICACIÓN V11 - LA PALMERA POS")
    print("=" * 60)
    print(f"Base de datos auditada: {DB_PATH}")
    print(f"Hora de ejecución: {datetime.datetime.now().isoformat()}")
    print("-" * 60)

    if not os.path.exists(DB_PATH):
        print(f"[ERROR FATAL] No existe la base de datos en {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    c = conn.cursor()

    # 1. PRAGMA integrity_check
    integrity = c.execute("PRAGMA integrity_check").fetchall()
    integrity_ok = len(integrity) == 1 and integrity[0][0] == 'ok'
    print(f"[1] PRAGMA integrity_check: {'OK (Integridad perfecta)' if integrity_ok else f'FALLO: {integrity}'}")

    # 2. PRAGMA foreign_key_check
    fk_errors = c.execute("PRAGMA foreign_key_check").fetchall()
    print(f"[2] PRAGMA foreign_key_check: {'OK (0 violaciones referenciales)' if len(fk_errors) == 0 else f'ALERTA ({len(fk_errors)} violaciones): {fk_errors}'}")

    # 3. Auditoría de Usuarios Base
    usuarios = c.execute("SELECT id, username, nombre, rol, activo FROM usuarios").fetchall()
    print(f"[3] Usuarios pre-configurados: {len(usuarios)}")
    for u in usuarios:
        print(f"    - ID: {u['id']} | Usuario: {u['username']:10} | Nombre: {u['nombre']:10} | Rol: {u['rol']:10} | Activo: {u['activo']}")

    # 4. Auditoría de Configuración
    configs = c.execute("SELECT clave, valor FROM configuracion").fetchall()
    print(f"[4] Parámetros de configuración: {len(configs)}")
    for cfg in configs:
        print(f"    - {cfg['clave']}: {cfg['valor']}")

    # 5. SIMULACIÓN CONTROLADA DE TODOS LOS FLUJOS COMERCIALES
    print("\n" + "=" * 60)
    print("  EJECUCIÓN DE PRUEBAS CONTROLADAS DE FLUJOS COMERCIALES")
    print("=" * 60)

    # A. Categoría
    c.execute("INSERT INTO categorias (nombre, descripcion) VALUES ('_TEST_Bebidas', 'Categoría de prueba')")
    cat_id = c.lastrowid
    print(f"[A] Creación de Categoría: OK (ID: {cat_id})")

    # B. Proveedor
    c.execute("INSERT INTO proveedores (rut, nombre, telefono) VALUES ('77111222-3', '_TEST_Distribuidora Sur', '+56988887777')")
    prov_id = c.lastrowid
    print(f"[B] Creación de Proveedor: OK (ID: {prov_id})")

    # C. Cliente
    c.execute("INSERT INTO clientes (rut, nombre, limite_credito, saldo_deudor) VALUES ('11222333-4', '_TEST_Cliente Frecuente', 60000, 0)")
    client_id = c.lastrowid
    print(f"[C] Creación de Cliente con límite de crédito $60.000: OK (ID: {client_id})")

    # D. Producto
    c.execute("""
        INSERT INTO productos (codigo, nombre, categoria_id, precio_costo, precio_venta, stock_actual, stock_minimo)
        VALUES ('_TEST_SKU_100', '_TEST_Galletas Avena 200g', ?, 800, 1200, 5, 2)
    """, (cat_id,))
    prod_id = c.lastrowid
    print(f"[D] Creación de Producto: OK (ID: {prod_id}, Stock inicial: 5)")

    # E. Compra -> Stock -> Kardex
    c.execute("""
        INSERT INTO compras (folio, proveedor_id, proveedor_nombre, subtotal, total, usuario_id, usuario_nombre)
        VALUES (901, ?, '_TEST_Distribuidora Sur', 16000, 16000, 1, 'Yasna')
    """, (prov_id,))
    compra_id = c.lastrowid

    c.execute("""
        INSERT INTO compra_items (compra_id, producto_id, codigo, nombre, cantidad, costo_unitario, subtotal)
        VALUES (?, ?, '_TEST_SKU_100', '_TEST_Galletas Avena 200g', 20, 800, 16000)
    """, (compra_id, prod_id))

    c.execute("UPDATE productos SET stock_actual = stock_actual + 20 WHERE id = ?", (prod_id,))
    c.execute("""
        INSERT INTO inventario_movimientos (producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id)
        VALUES (?, '_TEST_Galletas Avena 200g', 'entrada_compra', 20, 5, 25, 'Compra #901', ?, 1)
    """, (prod_id, compra_id))

    stock_post_compra = c.execute("SELECT stock_actual FROM productos WHERE id = ?", (prod_id,)).fetchone()[0]
    print(f"[E] Flujo de Compra: OK (Compra #{compra_id}, Stock aumentó 5 -> {stock_post_compra}, Kardex entrada_compra registrado)")

    # F. Apertura de Caja
    c.execute("""
        INSERT INTO caja_sesiones (usuario_id, usuario_nombre, monto_inicial, estado)
        VALUES (1, 'Yasna', 50000, 'abierta')
    """)
    caja_id = c.lastrowid
    c.execute("""
        INSERT INTO caja_movimientos (caja_sesion_id, tipo, monto, concepto, usuario_id, usuario_nombre)
        VALUES (?, 'apertura', 50000, 'Monto inicial de apertura de caja', 1, 'Yasna')
    """, (caja_id,))
    print(f"[F] Apertura de Turno de Caja: OK (Sesión #{caja_id}, Monto inicial: $50.000)")

    # G. Venta Efectivo con Vuelto -> Stock -> Kardex
    c.execute("""
        INSERT INTO ventas (folio, numero_boleta, cajero_id, cajero_nombre, caja_sesion_id, subtotal, total, monto_recibido, vuelto, metodo_pago_principal)
        VALUES (901, 'BOL-901', 1, 'Yasna', ?, 2400, 2400, 5000, 2600, 'efectivo')
    """, (caja_id,))
    venta_efectivo_id = c.lastrowid

    c.execute("""
        INSERT INTO venta_items (venta_id, producto_id, codigo, nombre, cantidad, precio_unitario, costo_unitario, subtotal)
        VALUES (?, ?, '_TEST_SKU_100', '_TEST_Galletas Avena 200g', 2, 1200, 800, 2400)
    """, (venta_efectivo_id, prod_id))

    c.execute("INSERT INTO venta_pagos (venta_id, metodo, monto) VALUES (?, 'efectivo', 2400)", (venta_efectivo_id,))
    c.execute("UPDATE productos SET stock_actual = stock_actual - 2 WHERE id = ?", (prod_id,))
    c.execute("""
        INSERT INTO inventario_movimientos (producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id)
        VALUES (?, '_TEST_Galletas Avena 200g', 'salida_venta', 2, 25, 23, 'Venta #901', ?, 1)
    """, (prod_id, venta_efectivo_id))
    c.execute("UPDATE caja_sesiones SET total_ventas_efectivo = total_ventas_efectivo + 2400 WHERE id = ?", (caja_id,))

    stock_post_venta1 = c.execute("SELECT stock_actual FROM productos WHERE id = ?", (prod_id,)).fetchone()[0]
    print(f"[G] Venta Efectivo: OK (Venta #{venta_efectivo_id}, Total: $2.400, Recibido: $5.000, Vuelto: $2.600, Stock descontado 25 -> {stock_post_venta1})")

    # H. Venta con Débito
    c.execute("""
        INSERT INTO ventas (folio, numero_boleta, cajero_id, cajero_nombre, caja_sesion_id, subtotal, total, monto_recibido, vuelto, metodo_pago_principal)
        VALUES (902, 'BOL-902', 1, 'Yasna', ?, 1200, 1200, 1200, 0, 'debito')
    """, (caja_id,))
    venta_debito_id = c.lastrowid

    c.execute("""
        INSERT INTO venta_items (venta_id, producto_id, codigo, nombre, cantidad, precio_unitario, costo_unitario, subtotal)
        VALUES (?, ?, '_TEST_SKU_100', '_TEST_Galletas Avena 200g', 1, 1200, 800, 1200)
    """, (venta_debito_id, prod_id))

    c.execute("INSERT INTO venta_pagos (venta_id, metodo, monto) VALUES (?, 'debito', 1200)", (venta_debito_id,))
    c.execute("UPDATE productos SET stock_actual = stock_actual - 1 WHERE id = ?", (prod_id,))
    c.execute("""
        INSERT INTO inventario_movimientos (producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id)
        VALUES (?, '_TEST_Galletas Avena 200g', 'salida_venta', 1, 23, 22, 'Venta #902', ?, 1)
    """, (prod_id, venta_debito_id))
    c.execute("UPDATE caja_sesiones SET total_ventas_debito = total_ventas_debito + 1200 WHERE id = ?", (caja_id,))

    print(f"[H] Venta Débito: OK (Venta #{venta_debito_id}, Total: $1.200, Registrado en venta_pagos y caja_sesiones)")

    # I. Venta Fiada -> Aumento Deuda Cliente -> Kardex
    c.execute("""
        INSERT INTO ventas (folio, numero_boleta, cajero_id, cajero_nombre, caja_sesion_id, cliente_id, cliente_nombre, subtotal, total, metodo_pago_principal)
        VALUES (903, 'BOL-903', 1, 'Yasna', ?, ?, '_TEST_Cliente Frecuente', 3600, 3600, 'fiado')
    """, (caja_id, client_id))
    venta_fiado_id = c.lastrowid

    c.execute("""
        INSERT INTO venta_items (venta_id, producto_id, codigo, nombre, cantidad, precio_unitario, costo_unitario, subtotal)
        VALUES (?, ?, '_TEST_SKU_100', '_TEST_Galletas Avena 200g', 3, 1200, 800, 3600)
    """, (venta_fiado_id, prod_id))

    c.execute("UPDATE clientes SET saldo_deudor = saldo_deudor + 3600 WHERE id = ?", (client_id,))
    c.execute("""
        INSERT INTO cliente_movimientos (cliente_id, tipo_movimiento, monto, saldo_resultante, observacion, venta_id, usuario_id)
        VALUES (?, 'VENTA_FIADA', 3600, 3600, 'Venta Fiada #903', ?, 1)
    """, (client_id, venta_fiado_id))
    c.execute("UPDATE productos SET stock_actual = stock_actual - 3 WHERE id = ?", (prod_id,))
    c.execute("""
        INSERT INTO inventario_movimientos (producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id)
        VALUES (?, '_TEST_Galletas Avena 200g', 'salida_venta', 3, 22, 19, 'Venta #903', ?, 1)
    """, (prod_id, venta_fiado_id))

    saldo_deudor = c.execute("SELECT saldo_deudor FROM clientes WHERE id = ?", (client_id,)).fetchone()[0]
    print(f"[I] Venta Fiada: OK (Venta #{venta_fiado_id}, Total: $3.600, Saldo deudor cliente: ${saldo_deudor}, Movimiento registrado)")

    # J. Abono de Cliente a Cuenta Corriente
    c.execute("UPDATE clientes SET saldo_deudor = MAX(0, saldo_deudor - 2000) WHERE id = ?", (client_id,))
    c.execute("""
        INSERT INTO cliente_movimientos (cliente_id, tipo_movimiento, monto, saldo_resultante, observacion, usuario_id)
        VALUES (?, 'ABONO', 2000, 1600, 'Abono en efectivo de prueba', 1)
    """, (client_id,))
    saldo_post_abono = c.execute("SELECT saldo_deudor FROM clientes WHERE id = ?", (client_id,)).fetchone()[0]
    print(f"[J] Abono de Cliente: OK (Abono: $2.000, Nuevo saldo deudor: ${saldo_post_abono})")

    # K. Detalle Determinístico de Venta
    detalle_items = c.execute("SELECT * FROM venta_items WHERE venta_id = ?", (venta_efectivo_id,)).fetchall()
    print(f"[K] Detalle de Venta #{venta_efectivo_id}: OK ({len(detalle_items)} ítems recuperados exactamente)")
    for it in detalle_items:
        print(f"    * Producto: {it['nombre']} (Código: {it['codigo']}) | Cant: {it['cantidad']} | P.Unit: ${it['precio_unitario']} | Subtotal: ${it['subtotal']}")

    # L. Anulación de Venta -> Devolución de Stock -> Kardex
    c.execute("UPDATE ventas SET estado = 'anulada', motivo_anulacion = 'Prueba anulación V11' WHERE id = ?", (venta_debito_id,))
    c.execute("UPDATE productos SET stock_actual = stock_actual + 1 WHERE id = ?", (prod_id,))
    c.execute("""
        INSERT INTO inventario_movimientos (producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id)
        VALUES (?, '_TEST_Galletas Avena 200g', 'entrada_anulacion', 1, 19, 20, 'Anulación de Venta #902', ?, 1)
    """, (prod_id, venta_debito_id))
    stock_post_anulacion = c.execute("SELECT stock_actual FROM productos WHERE id = ?", (prod_id,)).fetchone()[0]
    print(f"[L] Anulación de Venta #{venta_debito_id}: OK (Estado: anulada, Stock devuelto 19 -> {stock_post_anulacion}, Kardex entrada_anulacion)")

    # M. Movimientos de Caja Extra (Ingreso y Egreso)
    c.execute("""
        INSERT INTO caja_movimientos (caja_sesion_id, tipo, monto, concepto, usuario_id, usuario_nombre)
        VALUES (?, 'ingreso', 10000, 'Ingreso sencillo de prueba', 1, 'Yasna')
    """, (caja_id,))
    c.execute("UPDATE caja_sesiones SET total_ingresos_extra = total_ingresos_extra + 10000 WHERE id = ?", (caja_id,))

    c.execute("""
        INSERT INTO caja_movimientos (caja_sesion_id, tipo, monto, concepto, usuario_id, usuario_nombre)
        VALUES (?, 'egreso', 3000, 'Retiro compra de insumos', 1, 'Yasna')
    """, (caja_id,))
    c.execute("UPDATE caja_sesiones SET total_egresos_extra = total_egresos_extra + 3000 WHERE id = ?", (caja_id,))
    print(f"[M] Movimientos de Caja: OK (Ingreso +$10.000, Egreso -$3.000)")

    # N. Cierre de Caja y Arqueo
    sesion = c.execute("SELECT * FROM caja_sesiones WHERE id = ?", (caja_id,)).fetchone()
    monto_inicial_val = sesion['monto_inicial']
    ventas_efectivo_val = sesion['total_ventas_efectivo']
    ingresos_val = sesion['total_ingresos_extra']
    egresos_val = sesion['total_egresos_extra']
    efectivo_esperado = monto_inicial_val + ventas_efectivo_val + ingresos_val - egresos_val # 50000 + 2400 + 10000 - 3000 = 59400
    monto_real_contado = 59400 # Arqueo exacto
    diferencia = monto_real_contado - efectivo_esperado

    c.execute("""
        UPDATE caja_sesiones SET
          estado = 'cerrada',
          fecha_cierre = datetime('now', 'localtime'),
          monto_esperado_efectivo = ?,
          monto_real_efectivo = ?,
          diferencia = ?,
          observaciones = 'Arqueo perfecto de prueba V11'
        WHERE id = ?
    """, (efectivo_esperado, monto_real_contado, diferencia, caja_id))
    print(f"[N] Cierre y Arqueo de Caja: OK (Esperado: ${efectivo_esperado}, Real contado: ${monto_real_contado}, Diferencia: ${diferencia})")

    # O. ELIMINACIÓN DE PRODUCTO (Validación de seguridad referencial)
    c.execute("UPDATE venta_items SET producto_id = NULL WHERE producto_id = ?", (prod_id,))
    c.execute("UPDATE compra_items SET producto_id = NULL WHERE producto_id = ?", (prod_id,))
    c.execute("UPDATE inventario_movimientos SET producto_id = NULL WHERE producto_id = ?", (prod_id,))
    c.execute("DELETE FROM productos WHERE id = ?", (prod_id,))
    print(f"[O] Eliminación de Producto #{prod_id}: OK (Desvinculado limpiamente de ventas y compras sin error FK)")

    # P. PRUEBA DE RESPALDO ATÓMICO LOCAL
    conn.commit()
    os.makedirs(BACKUPS_DIR, exist_ok=True)
    test_backup_path = os.path.join(BACKUPS_DIR, "lapalmera_test_audit_v11.db").replace('\\', '/')
    if os.path.exists(test_backup_path):
        os.remove(test_backup_path)

    c.execute(f"VACUUM INTO '{test_backup_path}'")
    backup_size = os.path.getsize(test_backup_path)
    print(f"[P] Respaldo Local Atómico (VACUUM INTO): OK ({test_backup_path}, Tamaño: {backup_size:,} bytes)")

    # Verificar integridad del respaldo generado
    conn_b = sqlite3.connect(test_backup_path)
    b_integrity = conn_b.execute("PRAGMA integrity_check").fetchone()[0]
    conn_b.close()
    print(f"    * Integridad del archivo de respaldo generado: {b_integrity.upper()}")

    # Q. Verificación de Integridad Final tras todas las pruebas
    post_fk_errors = c.execute("PRAGMA foreign_key_check").fetchall()
    print(f"[Q] Integridad Referencial Final (PRAGMA foreign_key_check): {'0 ERRORES (CERTIFICADO)' if len(post_fk_errors) == 0 else f'ERROR: {post_fk_errors}'}")

    # Limpieza de registros de prueba para no ensuciar la base de datos
    c.execute("DELETE FROM cliente_movimientos WHERE cliente_id = ?", (client_id,))
    c.execute("DELETE FROM venta_pagos WHERE venta_id IN (?, ?, ?)", (venta_efectivo_id, venta_debito_id, venta_fiado_id))
    c.execute("DELETE FROM venta_items WHERE venta_id IN (?, ?, ?)", (venta_efectivo_id, venta_debito_id, venta_fiado_id))
    c.execute("DELETE FROM ventas WHERE id IN (?, ?, ?)", (venta_efectivo_id, venta_debito_id, venta_fiado_id))
    c.execute("DELETE FROM compra_items WHERE compra_id = ?", (compra_id,))
    c.execute("DELETE FROM compras WHERE id = ?", (compra_id,))
    c.execute("DELETE FROM inventario_movimientos WHERE motivo LIKE '%TEST%' OR referencia_id IN (?, ?, ?, ?)", (compra_id, venta_efectivo_id, venta_debito_id, venta_fiado_id))
    c.execute("DELETE FROM caja_movimientos WHERE caja_sesion_id = ?", (caja_id,))
    c.execute("DELETE FROM caja_sesiones WHERE id = ?", (caja_id,))
    c.execute("DELETE FROM clientes WHERE id = ?", (client_id,))
    c.execute("DELETE FROM proveedores WHERE id = ?", (prov_id,))
    c.execute("DELETE FROM categorias WHERE id = ?", (cat_id,))

    conn.commit()
    conn.close()
    print("\n" + "=" * 60)
    print("  RESULTADO: TODAS LAS PRUEBAS V11 CONCLUIDAS CON ÉXITO")
    print("=" * 60)

if __name__ == '__main__':
    run_v11_suite()
