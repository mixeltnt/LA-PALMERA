// Tipos de Turnos y Movimientos de Caja
export type CashMovementType = 'ingreso' | 'egreso' | 'apertura' | 'cierre';

export interface CashMovement {
  id: string | number;
  cajaSesionId: string | number;
  tipo: CashMovementType;
  monto: number;
  concepto: string;
  fecha: string;
  usuarioId: string | number;
  usuarioNombre?: string;
}

export interface CashboxSession {
  id: string | number;
  usuarioId: string | number;
  usuarioNombre?: string;
  fechaApertura: string;
  montoInicial: number;
  fechaCierre?: string;
  montoEsperadoEfectivo?: number;
  montoRealEfectivo?: number;
  diferencia?: number;
  totalVentasEfectivo?: number;
  totalVentasDebito?: number;
  totalVentasCredito?: number;
  totalVentasTransferencia?: number;
  totalIngresosExtra?: number;
  totalEgresosExtra?: number;
  estado: 'abierta' | 'cerrada';
  observaciones?: string;
}
