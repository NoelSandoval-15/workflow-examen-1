import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { WorkflowTemplate, CreateWorkflowRequest } from '../models/workflow.model';

@Injectable({ providedIn: 'root' })
export class WorkflowTemplateService {

  private base = `${environment.apiUrl}/workflow`;

  constructor(private http: HttpClient) {}

  listar(): Observable<WorkflowTemplate[]> {
    return this.http.get<ApiResponse<WorkflowTemplate[]>>(`${this.base}/templates`)
      .pipe(map(r => r.data));
  }

  obtener(id: string): Observable<WorkflowTemplate> {
    return this.http.get<ApiResponse<WorkflowTemplate>>(`${this.base}/templates/${id}`)
      .pipe(map(r => r.data));
  }

  crear(request: CreateWorkflowRequest): Observable<WorkflowTemplate> {
    return this.http.post<ApiResponse<WorkflowTemplate>>(`${this.base}/templates`, request)
      .pipe(map(r => r.data));
  }

  actualizar(id: string, request: CreateWorkflowRequest): Observable<WorkflowTemplate> {
    return this.http.put<ApiResponse<WorkflowTemplate>>(`${this.base}/templates/${id}`, request)
      .pipe(map(r => r.data));
  }

  activar(id: string): Observable<WorkflowTemplate> {
    return this.http.put<ApiResponse<WorkflowTemplate>>(`${this.base}/templates/${id}/activar`, {})
      .pipe(map(r => r.data));
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/templates/${id}`)
      .pipe(map(r => r.data));
  }
}
