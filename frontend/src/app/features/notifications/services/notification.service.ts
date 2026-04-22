import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

export interface Notification {
  id: string;
  usuarioId: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  referenciaId?: string;
  leida: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private base = `${environment.apiUrl}/notificaciones`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Notification[]> {
    return this.http.get<ApiResponse<Notification[]>>(this.base).pipe(map(r => r.data));
  }

  contarNoLeidas(): Observable<number> {
    return this.http.get<ApiResponse<{ noLeidas: number }>>(`${this.base}/contador`)
      .pipe(map(r => r.data.noLeidas));
  }

  marcarLeida(id: string): Observable<Notification> {
    return this.http.put<ApiResponse<Notification>>(`${this.base}/${id}/leer`, {})
      .pipe(map(r => r.data));
  }

  marcarTodasLeidas(): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.base}/leer-todas`, {})
      .pipe(map(() => void 0));
  }
}
