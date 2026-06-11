import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

export interface CampoFormulario {
  id: string;
  etiqueta: string;
  tipo: 'TEXTO' | 'TEXTO_LARGO' | 'NUMERO' | 'FECHA' | 'CHECKBOX' | 'TELEFONO' | 'EMAIL' | 'ARCHIVO';
  requerido: boolean;
  valor?: string | boolean;
  archivoUrl?: string;
  archivoNombre?: string;
}

export interface Task {
  id: string;
  procesoInstanciaId: string;
  procesoInstanciaCodigo?: string;
  nodoId?: string;
  nombre: string;
  tipo?: string;
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'RECHAZADO' | 'CANCELADO';
  departamentoAsignadoId?: string;
  usuarioAsignadoId?: string;
  observacion?: string;
  formularioDinamicoHabilitado?: boolean;
  datosFormulario?: CampoFormulario[];
  fechaInicio?: string;
  fechaLimite?: string;
  fechaCompletado?: string;
  createdAt?: string;
  // Campos del nodo para Gestión Documental
  formatosPermitidos?: string[];       // ['pdf','docx','xlsx',...]
  permisoDefectoCreador?: string;      // 'VER' | 'EDITAR' | 'NINGUNO'
  nivelVisibilidadGlobal?: string;     // 'PRIVADO' | 'DEPARTAMENTO' | 'PUBLICO'
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private base = `${environment.apiUrl}/tareas`;

  constructor(private http: HttpClient) {}

  /** Tareas del usuario autenticado */
  misTareas(): Observable<Task[]> {
    return this.http.get<ApiResponse<Task[]>>(`${this.base}/mis-tareas`)
      .pipe(map(r => r.data));
  }

  listarPorUsuarioYDepartamento(usuarioId: string, departamentoId: string): Observable<Task[]> {
    return this.http.get<ApiResponse<Task[]>>(`${this.base}/usuario/${usuarioId}/departamento/${departamentoId}`)
      .pipe(map(r => r.data));
  }

  listarPorInstancia(instanciaId: string): Observable<Task[]> {
    return this.http.get<ApiResponse<Task[]>>(`${this.base}/instancia/${instanciaId}`)
      .pipe(map(r => r.data));
  }

  completar(id: string, observacion: string): Observable<Task> {
    return this.http.put<ApiResponse<Task>>(
      `${this.base}/${id}/completar`,
      null,
      { params: { observacion } }
    ).pipe(map(r => r.data));
  }

  /** Guarda el formulario dinámico llenado por el funcionario */
  guardarFormulario(id: string, campos: CampoFormulario[]): Observable<Task> {
    return this.http.put<ApiResponse<Task>>(
      `${this.base}/${id}/formulario`,
      { campos }
    ).pipe(map(r => r.data));
  }

  /** Reclama una tarea del pool del departamento */
  reclamar(id: string): Observable<Task> {
    return this.http.put<ApiResponse<Task>>(`${this.base}/${id}/reclamar`, null)
      .pipe(map(r => r.data));
  }
}

