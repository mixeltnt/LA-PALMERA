// Tipos de Compras e Inventario
export interface PurchaseItem {
  id?: string | number;
  compraId?: string | number;
  productoId: string | number;
  codigo: string;
  nombre: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

export interface Purchase {
  id: string | number;
  folio?: string | number;
  numeroFactura?: string;
  proveedorId?: string | number;
  proveedorNombre?: string;
  fecha: string;
  items: PurchaseItem[];
  subtotal: number;
  impuestoTotal: number;
  total: number;
  estado: 'completada' | 'anulada' | 'pendiente';
  usuarioId: string | number;
  usuarioNombre?: string;
  notas?: string;
}

export interface InventoryMovement {
  id: string | number;
  productoId: string | number;
  productoNombre?: string;
  tipo: 'entrada_compra' | 'salida_venta' | 'ajuste_positivo' | 'ajuste_negativo' | 'merma' | 'devolucion';
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo?: string;
  referenciaId?: string | number;
  usuarioId: string | number;
  fecha: string;
}
