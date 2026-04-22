import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

export interface User {
  id: string; rolId: string; departamentoId?: string;
  nombre: string; apellido: string; correo: string;
  username: string; activo: boolean; createdAt?: string;
}

export interface CreateUserRequest {
  rolId: string; departamentoId?: string;
  nombre: string; apellido: string; correo: string;
  username: string; password: string;
}

export interface Departamento {
  id: string; nombre: string; descripcion?: string; activo: boolean;
}

export interface Cliente {
  id: string; nombre: string; apellido?: string;
  correo?: string; telefono?: string; direccion?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  // Usuarios
  listarUsuarios(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${environment.apiUrl}/usuarios`).pipe(map(r => r.data));
  }
  crearUsuario(req: CreateUserRequest): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${environment.apiUrl}/usuarios`, req).pipe(map(r => r.data));
  }

  // Departamentos
  listarDepartamentos(): Observable<Departamento[]> {
    return this.http.get<ApiResponse<Departamento[]>>(`${environment.apiUrl}/organization/departamentos`).pipe(map(r => r.data));
  }
  crearDepartamento(req: { nombre: string; descripcion?: string }): Observable<Departamento> {
    return this.http.post<ApiResponse<Departamento>>(`${environment.apiUrl}/organization/departamentos`, req).pipe(map(r => r.data));
  }

  // Clientes
  listarClientes(): Observable<Cliente[]> {
    return this.http.get<ApiResponse<Cliente[]>>(`${environment.apiUrl}/clientes`).pipe(map(r => r.data));
  }
  crearCliente(req: Partial<Cliente>): Observable<Cliente> {
    return this.http.post<ApiResponse<Cliente>>(`${environment.apiUrl}/clientes`, req).pipe(map(r => r.data));
  }
}
