// Tipos de Ventas y Pagos
export type PaymentMethod = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'mixto' | 'otro';
export type SaleStatus = 'completada' | 'anulada' | 'pendiente';

export interface SaleItem {
  id?: string | number;
  ventaId?: string | number;
  productoId: string | number;
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario?: number;
  descuento?: number;
  subtotal: number;
}

export interface SalePayment {
  id?: string | number;
  metodo: PaymentMethod;
  monto: number;
  referencia?: string;
}

export interface Sale {
  id: string | number;
  _id?: string;
  folio?: string | number;
  numeroVenta?: string | number;
  numeroBoleta?: string;
  fecha: string;
  cajeroId: string | number;
  cajeroNombre?: string;
  usuario?: { id?: number | string; nombre?: string; username?: string } | null;
  cajaSesionId?: string | number;
  clienteId?: string | number;
  clienteNombre?: string;
  cliente?: any;
  items: SaleItem[];
  pagos: SalePayment[];
  subtotal: number;
  descuentoTotal: number;
  impuestoTotal: number;
  total: number;
  montoRecibido?: number;
  vuelto?: number;
  metodoPagoPrincipal: PaymentMethod;
  metodoPago?: PaymentMethod | string;
  estado: SaleStatus;
  motivoAnulacion?: string;
  notas?: string;
  sincronizado?: boolean;
}
