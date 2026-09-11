// Tipos de Usuarios y Autenticación
export type UserRole = 'admin' | 'cajero' | 'supervisor';

export interface User {
  id: string | number;
  username: string;
  nombre: string;
  apellido?: string;
  rol: UserRole;
  activo: boolean;
  email?: string;
  telefono?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface AuthSession {
  user: User;
  token?: string;
  isAuthenticated: boolean;
  expiresAt?: string;
}
