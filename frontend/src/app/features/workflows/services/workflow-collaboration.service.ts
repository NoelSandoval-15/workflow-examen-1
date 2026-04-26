import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { WorkflowNode, WorkflowEdge } from '../models/workflow.model';

export interface CollaborationLinkDTO {
  templateId: string;
  templateNombre: string;
  collaborationToken: string;
  collaborationUrl: string;
  collaborationEnabled: boolean;
}

export interface CollaborationSessionDTO {
  templateId: string;
  templateNombre: string;
  tipoSolicitud?: string;
  bpmnXml?: string;
  nodos: WorkflowNode[];
  conexiones: WorkflowEdge[];
  collaborationVersion: number;
  collaborationUpdatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkflowCollaborationService {

  private base = `${environment.apiUrl}/workflow`;

  constructor(private http: HttpClient) {}

  /** Genera o devuelve el link colaborativo existente */
  generarLink(templateId: string): Observable<CollaborationLinkDTO> {
    return this.http
      .post<ApiResponse<CollaborationLinkDTO>>(
        `${this.base}/templates/${templateId}/collaboration-link`, {}
      ).pipe(map(r => r.data));
  }

  /** Invalida el token anterior y genera uno nuevo */
  regenerarLink(templateId: string): Observable<CollaborationLinkDTO> {
    return this.http
      .post<ApiResponse<CollaborationLinkDTO>>(
        `${this.base}/templates/${templateId}/collaboration-link/regenerate`, {}
      ).pipe(map(r => r.data));
  }

  /** Revoca el link — nadie más puede entrar */
  revocarLink(templateId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(
        `${this.base}/templates/${templateId}/collaboration-link`
      ).pipe(map(() => void 0));
  }

  /** Resuelve el token y obtiene los datos del flujo (sin JWT) */
  resolverToken(token: string): Observable<CollaborationSessionDTO> {
    return this.http
      .get<ApiResponse<CollaborationSessionDTO>>(
        `${this.base}/collaborate/${token}`
      ).pipe(map(r => r.data));
  }
}
