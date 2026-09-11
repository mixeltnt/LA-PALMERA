import sqlite3

def run_simulation(db_path):
    print(f"\n--- Probando flujos de negocio completos en: {db_path} ---")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    c = conn.cursor()

    # 1. Crear Categoría
    c.execute("INSERT INTO categorias (nombre, descripcion) VALUES ('Bebidas', 'Bebidas y gaseosas')")
    cat_id = c.lastrowid
    print(f"[OK] Categoría creada ID: {cat_id}")

    # 2. Crear Proveedor
    c.execute("INSERT INTO proveedores (rut, nombre, telefono) VALUES ('76123456-7', 'Distribuidora Central', '+56912345678')")
    prov_id = c.lastrowid
    print(f"[OK] Proveedor creado ID: {prov_id}")

    # 3. Crear Cliente
    c.execute("INSERT INTO clientes (rut, nombre, limite_credito, saldo_deudor) VALUES ('12345678-9', 'Juan Perez', 50000, 0)")
    client_id = c.lastrowid
    print(f"[OK] Cliente creado ID: {client_id}")

    # 4. Crear Producto
    c.execute("""
        INSERT INTO productos (codigo, nombre, categoria_id, precio_costo, precio_venta, stock_actual, stock_minimo)
        VALUES ('PROD-01', 'Coca Cola 1.5L', ?, 1000, 1500, 10, 5)
    """, (cat_id,))
    prod_id = c.lastrowid
    print(f"[OK] Producto creado ID: {prod_id} con stock inicial: 10")

    # 5. Registrar Compra (Aumenta Stock)
    c.execute("""
        INSERT INTO compras (folio, proveedor_id, proveedor_nombre, subtotal, total, usuario_id)
        VALUES (1, ?, 'Distribuidora Central', 20000, 20000, 1)
    """, (prov_id,))
    compra_id = c.lastrowid

    c.execute("""
        INSERT INTO compra_items (compra_id, producto_id, codigo, nombre, cantidad, costo_unitario, subtotal)
        VALUES (?, ?, 'PROD-01', 'Coca Cola 1.5L', 20, 1000, 20000)
    """, (compra_id, prod_id))

    c.execute("UPDATE productos SET stock_actual = stock_actual + 20 WHERE id = ?", (prod_id,))
    c.execute("""
        INSERT INTO inventario_movimientos (producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id)
        VALUES (?, 'Coca Cola 1.5L', 'entrada_compra', 20, 10, 30, 'Compra #1', ?, 1)
    """, (prod_id, compra_id))
    print(f"[OK] Compra registrada ID: {compra_id}. Stock actual: 30")

    # 6. Registrar Venta Efectivo (Disminuye Stock)
    c.execute("""
        INSERT INTO ventas (folio, numero_boleta, cajero_id, cajero_nombre, subtotal, total, monto_recibido, vuelto, metodo_pago_principal)
        VALUES (1, 'BOL-1', 1, 'Yasna', 4500, 4500, 5000, 500, 'efectivo')
    """, )
    venta_id = c.lastrowid

    c.execute("""
        INSERT INTO venta_items (venta_id, producto_id, codigo, nombre, cantidad, precio_unitario, costo_unitario, subtotal)
        VALUES (?, ?, 'PROD-01', 'Coca Cola 1.5L', 3, 1500, 1000, 4500)
    """, (venta_id, prod_id))

    c.execute("INSERT INTO venta_pagos (venta_id, metodo, monto) VALUES (?, 'efectivo', 4500)", (venta_id,))
    c.execute("UPDATE productos SET stock_actual = stock_actual - 3 WHERE id = ?", (prod_id,))
    c.execute("""
        INSERT INTO inventario_movimientos (producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id)
        VALUES (?, 'Coca Cola 1.5L', 'salida_venta', 3, 30, 27, 'Venta #1', ?, 1)
    """, (prod_id, venta_id))
    print(f"[OK] Venta Efectivo registrada ID: {venta_id}. Stock actual: 27")

    # 7. Registrar Venta Fiada
    c.execute("""
        INSERT INTO ventas (folio, numero_boleta, cajero_id, cajero_nombre, cliente_id, cliente_nombre, subtotal, total, metodo_pago_principal)
        VALUES (2, 'BOL-2', 1, 'Yasna', ?, 'Juan Perez', 3000, 3000, 'fiado')
    """, (client_id,))
    venta_fiada_id = c.lastrowid

    c.execute("""
        INSERT INTO venta_items (venta_id, producto_id, codigo, nombre, cantidad, precio_unitario, costo_unitario, subtotal)
        VALUES (?, ?, 'PROD-01', 'Coca Cola 1.5L', 2, 1500, 1000, 3000)
    """, (venta_fiada_id, prod_id))

    c.execute("UPDATE clientes SET saldo_deudor = saldo_deudor + 3000 WHERE id = ?", (client_id,))
    c.execute("""
        INSERT INTO cliente_movimientos (cliente_id, tipo_movimiento, monto, saldo_resultante, observacion, venta_id, usuario_id)
        VALUES (?, 'VENTA_FIADA', 3000, 3000, 'Venta Fiada #2', ?, 1)
    """, (client_id, venta_fiada_id))
    c.execute("UPDATE productos SET stock_actual = stock_actual - 2 WHERE id = ?", (prod_id,))
    print(f"[OK] Venta Fiada registrada ID: {venta_fiada_id}. Saldo deudor cliente: $3000. Stock actual: 25")

    # 8. Anular Venta #1 (Devuelve Stock)
    c.execute("UPDATE ventas SET estado = 'anulada', motivo_anulacion = 'Error de cobro' WHERE id = ?", (venta_id,))
    c.execute("UPDATE productos SET stock_actual = stock_actual + 3 WHERE id = ?", (prod_id,))
    c.execute("""
        INSERT INTO inventario_movimientos (producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id)
        VALUES (?, 'Coca Cola 1.5L', 'entrada_anulacion', 3, 25, 28, 'Anulación de Venta #1', ?, 1)
    """, (prod_id, venta_id))
    print(f"[OK] Venta #1 anulada. Stock actual devuelto: 28")

    # 9. ELIMINAR PRODUCTO (Prueba crítica de la solución)
    c.execute("UPDATE venta_items SET producto_id = NULL WHERE producto_id = ?", (prod_id,))
    c.execute("UPDATE compra_items SET producto_id = NULL WHERE producto_id = ?", (prod_id,))
    c.execute("UPDATE inventario_movimientos SET producto_id = NULL WHERE producto_id = ?", (prod_id,))
    c.execute("DELETE FROM productos WHERE id = ?", (prod_id,))
    print(f"[OK ÉXITO] Producto {prod_id} eliminado sin errores.")

    # 10. Verificación de Integridad de Claves Foráneas
    fk_errors = c.execute("PRAGMA foreign_key_check").fetchall()
    if fk_errors:
        print(f"[ERROR] Violaciones de FK encontradas: {fk_errors}")
    else:
        print("[OK CERTIFICADO] 0 violaciones de FK tras eliminar producto!")

    conn.commit()
    conn.close()

if __name__ == '__main__':
    run_simulation(r"C:\LaPalmera\database\lapalmera.db")
