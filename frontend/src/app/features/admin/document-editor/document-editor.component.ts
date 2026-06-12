import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService, Documento } from '../services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

declare const DocsAPI: any;

@Component({
  selector: 'app-document-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-wrapper">
      <div class="editor-header">
        <div class="editor-header-left">
          <button class="btn-volver" (click)="goBack()">
            <span class="arrow">&#8592;</span> Volver
          </button>
          <div class="doc-info" *ngIf="document">
            <span class="doc-icon">{{ getDocIcon(document.extension) }}</span>
            <span class="doc-nombre">{{ document.nombreArchivo }}</span>
          </div>
        </div>
        <div class="editor-header-right">
          <span class="badge-editando" *ngIf="document && !cargando && !error">
            <span class="dot"></span> Editando en OnlyOffice
          </span>
          <span class="badge-cargando" *ngIf="cargando">Cargando editor...</span>
          <span class="badge-error" *ngIf="error">{{ error }}</span>
        </div>
      </div>

      <div class="editor-body">
        <!-- Spinner flotante SOBRE el editor, no reemplaza el div del editor -->
        <div class="loading-overlay" *ngIf="cargando">
          <div class="spinner-ring"></div>
          <p>Iniciando editor colaborativo...</p>
        </div>

        <div class="error-overlay" *ngIf="error">
          <span style="font-size:48px">&#9888;&#65039;</span>
          <p>{{ error }}</p>
          <button class="btn-volver" style="margin-top:8px;" (click)="goBack()">Volver</button>
        </div>

        <!-- Siempre en el DOM — OnlyOffice necesita el elemento para montarse -->
        <div id="iframeEditor"
             [style.visibility]="(cargando || !!error) ? 'hidden' : 'visible'">
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .editor-wrapper {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 64px);
      background: #f1f5f9;
    }

    .editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      flex-shrink: 0;
      gap: 16px;
    }

    .editor-header-left { display: flex; align-items: center; gap: 16px; }

    .btn-volver {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px;
      border: 1.5px solid #e2e8f0; border-radius: 8px;
      background: #f8fafc; color: #374151;
      font-size: 13px; font-weight: 500; cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn-volver:hover { background: #e0e7ff; border-color: #6366f1; color: #4f46e5; }
    .arrow { font-size: 16px; }

    .doc-info { display: flex; align-items: center; gap: 8px; }
    .doc-icon { font-size: 20px; }
    .doc-nombre {
      font-weight: 600; font-size: 14px; color: #1e293b;
      max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .editor-header-right { display: flex; align-items: center; gap: 10px; }

    .badge-editando {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #fff; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .dot {
      width: 7px; height: 7px; background: #86efac; border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .badge-cargando { font-size: 12px; color: #f59e0b; font-weight: 500; }
    .badge-error    { font-size: 12px; color: #ef4444; font-weight: 500; }

    .editor-body { flex: 1; position: relative; overflow: hidden; }

    #iframeEditor { width: 100%; height: 100%; border: none; }

    /* Spinner/error flotan SOBRE el editor con position:absolute */
    .loading-overlay, .error-overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 16px;
      background: #f8fafc; z-index: 10;
    }
    .loading-overlay p, .error-overlay p {
      color: #64748b; font-size: 14px; margin: 0; text-align: center;
    }

    .spinner-ring {
      width: 48px; height: 48px;
      border: 4px solid #e2e8f0; border-top-color: #6366f1;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class DocumentEditorComponent implements OnInit, OnDestroy {
  document: Documento | null = null;
  cargando = true;
  error: string | null = null;
  private editorInstance: any = null;
  private origenRuta = '/admin/documentos';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private docService: DocumentService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Detectar desde qué sección llegamos para el botón Volver
    this.origenRuta = this.router.url.startsWith('/editor/') ? '/tareas' : '/admin/documentos';

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'ID de documento no encontrado en la URL';
      this.cargando = false;
      return;
    }

    // Cargamos siempre por ID para garantizar datos frescos (versionKey actualizado)
    this.docService.obtenerPorId(id).subscribe({
      next: doc => {
        this.document = doc;
        this.cdr.detectChanges();
        this.iniciarEditor();
      },
      error: () => {
        this.error = 'No se pudo cargar el documento desde el servidor';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.editorInstance) {
      try { this.editorInstance.destroyEditor(); } catch (_) {}
    }
  }

  goBack(): void {
    this.router.navigate([this.origenRuta]);
  }

  getDocIcon(ext: string): string {
    const e = (ext || '').toLowerCase();
    if (e === 'pdf') return '📄';
    if (['doc', 'docx'].includes(e)) return '📝';
    if (['xls', 'xlsx'].includes(e)) return '📊';
    if (['ppt', 'pptx'].includes(e)) return '📋';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(e)) return '🖼️';
    return '📁';
  }

  private iniciarEditor(): void {
    this.loadOnlyOfficeScript()
      .then(() => this.initEditor())
      .catch(() => {
        this.error = 'No se pudo conectar con OnlyOffice. ¿Está el servicio activo?';
        this.cargando = false;
        this.cdr.detectChanges();
      });
  }

  private loadOnlyOfficeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).DocsAPI) { return resolve(); }
      const script = document.createElement('script');
      script.src = environment.onlyOfficeUrl + '/web-apps/apps/api/documents/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  }

  private initEditor(): void {
    if (!this.document) return;

    this.docService.getPresignedUrl(this.document.id).subscribe({
      next: (presignedUrl: string) => {
        const ext = (this.document!.extension || '').toLowerCase();
        const currentUser = this.authService.currentUser;

        const editorConfig = {
          document: {
            fileType: ext,
            // CLAVE COLABORATIVA: estable durante toda la edición.
            // Solo se regenera en el callback cuando status=2 (cierre definitivo).
            key: this.document!.versionKey ?? this.document!.id,
            title: this.document!.nombreArchivo,
            url: presignedUrl
          },
          documentType: this.getDocumentType(ext),
          editorConfig: {
            // host.docker.internal permite a OnlyOffice (en Docker) alcanzar el backend local
            callbackUrl: `${environment.onlyOfficeCallbackUrl}/${this.document!.id}`,
            lang: 'es',
            mode: 'edit',
            user: {
              id: currentUser?.id ?? 'anonymous',
              name: currentUser?.name ?? 'Funcionario'
            },
            coEditing: { mode: 'fast' }
          }
        };

        // 1) Ocultar spinner → detectChanges() fuerza Angular a actualizar el DOM
        //    y hacer visible el div #iframeEditor ANTES de que DocsAPI lo necesite
        this.cargando = false;
        this.cdr.detectChanges();

        // 2) Timeout de 300ms para que el navegador complete el repintado
        //    y #iframeEditor tenga dimensiones reales cuando OnlyOffice se monte
        setTimeout(() => {
          try {
            this.editorInstance = new DocsAPI.DocEditor('iframeEditor', editorConfig);
          } catch (e: any) {
            this.error = 'Error al inicializar OnlyOffice: ' + (e?.message ?? 'desconocido');
            this.cdr.detectChanges();
          }
        }, 300);
      },
      error: () => {
        this.error = 'Error al generar URL de acceso al archivo en S3';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private getDocumentType(ext: string): string {
    if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'cell';
    if (['ppt', 'pptx'].includes(ext)) return 'slide';
    return 'word';
  }
}
