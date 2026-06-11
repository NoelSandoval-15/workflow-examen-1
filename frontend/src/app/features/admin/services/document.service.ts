import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

export interface Documento {
  id: string;
  procesoInstanciaId: string;
  tareaId: string;
  subidoPorId: string;
  nombreArchivo: string;
  ruta: string;
  mimeType: string;
  extension: string;
  tamanoBytes: number;
  esEvidencia: boolean;
  descripcion: string;
  versionKey?: string;  // Clave estable de sesión OnlyOffice para co-edición (opcional para datos mock/legacy)
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private baseUrl = `${environment.apiUrl}/archivos`;

  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Documento[]> {
    return this.http.get<ApiResponse<Documento[]>>(this.baseUrl).pipe(map(r => r.data));
  }

  listarPorInstancia(procesoInstanciaId: string): Observable<Documento[]> {
    return this.http.get<ApiResponse<Documento[]>>(`${this.baseUrl}/instancia/${procesoInstanciaId}`).pipe(map(r => r.data));
  }

  listarPorTarea(tareaId: string): Observable<Documento[]> {
    return this.http.get<ApiResponse<Documento[]>>(`${this.baseUrl}/tarea/${tareaId}`).pipe(map(r => r.data));
  }

  eliminar(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  obtenerPorId(id: string): Observable<Documento> {
    return this.http.get<ApiResponse<Documento>>(`${this.baseUrl}/${id}`).pipe(map(r => r.data));
  }


  getDownloadUrl(id: string): string {
    return `${this.baseUrl}/descargar/${id}`;
  }

  getViewUrl(id: string): string {
    return `${this.baseUrl}/ver/${id}`;
  }

  getPresignedUrl(id: string): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/presigned/${id}`).pipe(map(r => r.data));
  }

  downloadFile(id: string, filename: string): void {
    this.http.get(`${this.baseUrl}/descargar/${id}`, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('Error al descargar:', err);
        alert('Error al descargar el archivo.');
      }
    });
  }

  uploadFile(procesoInstanciaId: string, file: File, tareaId?: string, esEvidencia = false, descripcion = ''): Observable<Documento> {
    const formData = new FormData();
    formData.append('file', file);
    if (procesoInstanciaId) formData.append('procesoInstanciaId', procesoInstanciaId);
    if (tareaId) formData.append('tareaId', tareaId);
    if (descripcion) formData.append('descripcion', descripcion);
    formData.append('esEvidencia', String(esEvidencia));
    return this.http.post<ApiResponse<Documento>>(`${this.baseUrl}/subir`, formData).pipe(
      map(r => r.data)
    );
  }
}
