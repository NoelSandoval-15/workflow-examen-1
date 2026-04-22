import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

export interface Task {
  id: string;
  procesoInstanciaId: string;
  nodoId?: string;
  nombre: string;
  tipo?: string;
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'RECHAZADO' | 'CANCELADO';
  departamentoAsignadoId?: string;
  usuarioAsignadoId?: string;
  observacion?: string;
  fechaInicio?: string;
  fechaLimite?: string;
  fechaCompletado?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private base = `${environment.apiUrl}/tareas`;

  constructor(private http: HttpClient) {}

  listarPorUsuario(usuarioId: string): Observable<Task[]> {
    return this.http.get<ApiResponse<Task[]>>(`${this.base}/usuario/${usuarioId}`)
      .pipe(map(r => r.data));
  }

  listarPorInstancia(instanciaId: string): Observable<Task[]> {
    return this.http.get<ApiResponse<Task[]>>(`${this.base}/instancia/${instanciaId}`)
      .pipe(map(r => r.data));
  }

  completar(id: string, observacion: string): Observable<Task> {
    return this.http.put<ApiResponse<Task>>(`${this.base}/${id}/completar`, { observacion })
      .pipe(map(r => r.data));
  }
}
