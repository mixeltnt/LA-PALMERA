// Tipos de Clientes y Proveedores
export interface Customer {
  id: string | number;
  rut?: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  limiteCredito?: number;
  saldoDeudor?: number;
  activo: boolean;
  creadoEn?: string;
}

export interface Supplier {
  id: string | number;
  rut?: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
  creadoEn?: string;
}
