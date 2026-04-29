export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  rolId: string;
  departamentoId: string;
  nombre: string;
  userId: string;  // MongoDB _id — para filtrar tareas propias
}
