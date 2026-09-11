import os
import sqlite3

def seed_db(db_path):
    if not os.path.exists(db_path):
        print(f"Ruta no encontrada: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # 1. Categorías (16 categorías completas para almacén/minimarket)
    categorias = [
        (1, 'Bebidas y Refrescos', 'Gaseosas, jugos, aguas minerales y energéticas', 1, '#2563eb', 'bi-cup-straw', 1),
        (2, 'Abarrotes y Despensa', 'Arroz, fideos, aceites, harinas, salsas y legumbres', 1, '#16a34a', 'bi-basket', 2),
        (3, 'Panadería y Pastelería', 'Pan fresco diario, hallullas, marraquetas, empanadas y pasteles', 1, '#d97706', 'bi-cake2', 3),
        (4, 'Lácteos y Huevos', 'Leches, yogures, mantequillas, cremas y huevos de campo', 1, '#0891b2', 'bi-egg', 4),
        (5, 'Cecinas y Fiambrería', 'Jamones, salamis, vienesas, arrollados y quesos laminados', 1, '#dc2626', 'bi-pie-chart', 5),
        (6, 'Snacks y Galletas', 'Papas fritas, galletas dulces y saladas, ramitas y frutos secos', 1, '#ea580c', 'bi-cookie', 6),
        (7, 'Golosinas y Chocolates', 'Chocolates, gomitas, caramelos, chicles y confites', 1, '#db2777', 'bi-gift', 7),
        (8, 'Limpieza y Aseo del Hogar', 'Detergentes, cloro, lavalozas, desinfectantes y bolsas de basura', 1, '#059669', 'bi-droplet', 8),
        (9, 'Higiene y Cuidado Personal', 'Jabones, champú, pastas dentales, desodorantes y papel higiénico', 1, '#7c3aed', 'bi-person-heart', 9),
        (10, 'Congelados y Helados', 'Helados, hamburguesas, nuggets, papas prefritas y verduras', 1, '#0284c7', 'bi-snow', 10),
        (11, 'Frutas y Verduras', 'Frutas y verduras frescas seleccionadas de temporada', 1, '#65a30d', 'bi-apple', 11),
        (12, 'Carnes y Aves', 'Vacuno, pollo, cerdo, carnes para asado y carbón', 1, '#b91c1c', 'bi-fire', 12),
        (13, 'Cervezas, Vinos y Licores', 'Cervezas nacionales e importadas, vinos, piscos y destilados', 1, '#9333ea', 'bi-cup-hot', 13),
        (14, 'Cigarrillos y Tabacos', 'Cigarrillos, tabaco para armar, papelillos y encendedores', 1, '#4b5563', 'bi-lightning', 14),
        (15, 'Mascotas', 'Alimentos secos y húmedos para perros y gatos, premios y arena', 1, '#f97316', 'bi-heart', 15),
        (16, 'Desayuno y Café', 'Café en grano e instantáneo, té, yerba mate, azúcar y cereales', 1, '#78350f', 'bi-cup', 16),
    ]
    for cat in categorias:
        c.execute("""
            INSERT OR REPLACE INTO categorias (id, nombre, descripcion, activo, color, icono, orden)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, cat)

    # 2. Proveedores (3)
    proveedores = [
        (1, '96.792.000-2', 'Distribuidora CCU Chile S.A.', 'Andrés Valenzuela', '+56 9 8123 4567', 'ventas@ccuchile.cl', 'Av. Presidente Eduardo Frei Montalva 9600, Santiago', 1),
        (2, '91.144.000-8', 'Embotelladora Andina S.A.', 'Claudia Morales', '+56 9 7234 5678', 'pedidos@koandina.com', 'Av. El Peñón 0123, Puente Alto', 1),
        (3, '77.345.678-K', 'Distribuidora Abarrotes Central Ltda.', 'Roberto Fuentes', '+56 9 6345 6789', 'contacto@abarrotescentral.cl', 'Av. Los Pajaritos 4560, Maipú', 1),
    ]
    for prov in proveedores:
        c.execute("""
            INSERT OR REPLACE INTO proveedores (id, rut, nombre, contacto, telefono, email, direccion, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, prov)

    # 3. Productos (3)
    c.execute("PRAGMA table_info(productos)")
    cols = [col[1] for col in c.fetchall()]
    if 'proveedor_id' not in cols:
        try:
            c.execute("ALTER TABLE productos ADD COLUMN proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL")
        except:
            pass
    if 'marca' not in cols:
        try:
            c.execute("ALTER TABLE productos ADD COLUMN marca TEXT")
        except:
            pass

    productos = [
        (1, 'BEB-001', '7801610001014', 'Coca-Cola Original 1.5L', 'Bebida gaseosa sabor original 1.5 litros', 'Coca-Cola', 1, 1, 1700.0, 1100.0, 48.0, 10.0, 'unidad', 0, 1),
        (2, 'ABR-001', '7802500000011', 'Arroz Grado 1 Selección 1kg', 'Arroz grano largo seleccionado 1 kilo', 'Tucapel', 2, 3, 1450.0, 950.0, 36.0, 8.0, 'unidad', 0, 1),
        (3, 'PAN-001', '7803700000025', 'Pan Hallulla Especial 1kg', 'Pan tradicional recién horneado por kilo', 'Panadería La Palmera', 3, 2, 1350.0, 850.0, 25.0, 5.0, 'kg', 1, 1),
    ]
    for prod in productos:
        c.execute("""
            INSERT OR REPLACE INTO productos (id, codigo, codigo_barras, nombre, descripcion, marca, categoria_id, proveedor_id, precio_venta, precio_costo, stock_actual, stock_minimo, unidad_medida, permite_decimales, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, prod)

    # 4. Clientes para Fiar con 30.000 de Crédito (3)
    clientes = [
        (1, '15.874.321-3', 'Juan Carlos Pérez González', '+56 9 9123 4567', 'juan.perez@gmail.com', 'Calle Los Alerces 742', 'Santiago', 30000.0, 0.0, 1),
        (2, '17.654.321-3', 'María Elena Soto Martínez', '+56 9 8234 5678', 'maria.soto@gmail.com', 'Pasaje Las Flores 158', 'Santiago', 30000.0, 0.0, 1),
        (3, '19.432.109-0', 'Carlos Andrés Muñoz Valdés', '+56 9 7345 6789', 'carlos.munoz@gmail.com', 'Av. Central 890', 'Santiago', 30000.0, 0.0, 1),
    ]
    for cli in clientes:
        c.execute("""
            INSERT OR REPLACE INTO clientes (id, rut, nombre, telefono, email, direccion, ciudad, limite_credito, saldo_deudor, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, cli)

    conn.commit()

    print(f"[{db_path}] Datos insertados con éxito:")
    for t in ['categorias', 'proveedores', 'productos', 'clientes', 'ventas', 'compras']:
        cnt = c.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        print(f"   * {t:15}: {cnt} registros")

    conn.close()

if __name__ == '__main__':
    print("=== INSERTANDO DATOS DE PRUEBA OFICIALES ===")
    seed_db(r"C:\LaPalmera\database\lapalmera.db")
    seed_db(r"c:\Users\statu\Desktop\LA-PALMERA\database\lapalmera.db")
    seed_db(r"c:\Users\statu\Desktop\LA-PALMERA\release\database\lapalmera.db")
    print("=== PROCESO COMPLETADO ===")
