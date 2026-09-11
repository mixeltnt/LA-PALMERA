// Tipos de Productos y Categorías
export interface Category {
  id: string | number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  color?: string;
  icono?: string;
}

export interface Product {
  id: string | number;
  codigo: string;
  codigoBarras?: string;
  nombre: string;
  descripcion?: string;
  marca?: string;
  categoriaId?: string | number;
  categoriaNombre?: string;
  proveedorId?: string | number;
  proveedorNombre?: string;
  precioVenta: number;
  precioCosto: number;
  stockActual: number;
  stockMinimo: number;
  unidadMedida?: string; // 'unidad', 'kg', 'litro', 'gramos', etc.
  permiteDecimales?: boolean;
  activo: boolean;
  imagenUrl?: string;
  aplicaIva?: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}
