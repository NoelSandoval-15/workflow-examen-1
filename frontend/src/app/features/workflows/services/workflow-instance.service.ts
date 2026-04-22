import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ProcesoInstancia, IniciarProcesoRequest, AvanzarRequest } from '../models/workflow.model';

@Injectable({ providedIn: 'root' })
export class WorkflowInstanceService {

  private base = `${environment.apiUrl}/workflow`;

  constructor(private http: HttpClient) {}

  listar(): Observable<ProcesoInstancia[]> {
    return this.http.get<ApiResponse<ProcesoInstancia[]>>(`${this.base}/instancias`)
      .pipe(map(r => r.data));
  }

  obtener(id: string): Observable<ProcesoInstancia> {
    return this.http.get<ApiResponse<ProcesoInstancia>>(`${this.base}/instancias/${id}`)
      .pipe(map(r => r.data));
  }

  iniciar(request: IniciarProcesoRequest): Observable<ProcesoInstancia> {
    return this.http.post<ApiResponse<ProcesoInstancia>>(`${this.base}/instancias`, request)
      .pipe(map(r => r.data));
  }

  avanzar(id: string, request: AvanzarRequest): Observable<ProcesoInstancia> {
    return this.http.put<ApiResponse<ProcesoInstancia>>(`${this.base}/instancias/${id}/avanzar`, request)
      .pipe(map(r => r.data));
  }

  rechazar(id: string, motivo: string): Observable<ProcesoInstancia> {
    return this.http.put<ApiResponse<ProcesoInstancia>>(
      `${this.base}/instancias/${id}/rechazar`,
      null,
      { params: { motivo } }
    ).pipe(map(r => r.data));
  }
}
