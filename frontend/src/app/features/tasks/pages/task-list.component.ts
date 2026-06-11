import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TaskService, Task, CampoFormulario } from '../services/task.service';
import { WorkflowInstanceService } from '../../workflows/services/workflow-instance.service';
import { DynamicFormComponent } from './dynamic-form.component';
import { DocumentService, Documento } from '../../admin/services/document.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatDividerModule,
    MatTabsModule, MatSnackBarModule,
    DynamicFormComponent
  ],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss'
})
export class TaskListComponent implements OnInit {
  tareas: Task[] = [];
  loading = true;
  procesandoId: string | null = null;
  expandedId: string | null = null;
  observacionForm: FormGroup;

  /** IDs de tareas cuyos formularios han sido guardados en esta sesión */
  formulariosGuardados = new Set<string>();

  /** Documentos cargados por tarea: clave = tareaId */
  documentosPorTarea: Record<string, Documento[]> = {};
  cargandoDocumentos: Record<string, boolean> = {};
  subiendoArchivo: Record<string, boolean> = {};

  constructor(
    private taskService: TaskService,
    private instanceService: WorkflowInstanceService,
    public documentService: DocumentService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.observacionForm = this.fb.group({ observacion: [''] });
  }

  ngOnInit(): void {
    this.cargarTareas();
  }

  cargarTareas(): void {
    this.loading = true;
    this.taskService.misTareas().subscribe({
      next: data => {
        this.tareas = data.sort((a, b) => {
          const orden: Record<string, number> = { PENDIENTE: 0, EN_PROGRESO: 1, COMPLETADO: 2, CANCELADO: 3 };
          return (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9);
        });
        this.tareas.forEach(t => {
          if (t.datosFormulario && t.datosFormulario.length > 0) {
            this.formulariosGuardados.add(t.id);
          }
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  toggleExpand(id: string): void {
    if (this.expandedId === id) {
      this.expandedId = null;
    } else {
      this.expandedId = id;
      this.observacionForm.reset();
      // Cargar documentos al expandir si aún no se han cargado
      if (!this.documentosPorTarea[id]) {
        this.cargarDocumentosDeTarea(id);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Gestión Documental
  // ══════════════════════════════════════════════════════════════

  cargarDocumentosDeTarea(tareaId: string): void {
    this.cargandoDocumentos[tareaId] = true;
    this.documentService.listarPorTarea(tareaId).subscribe({
      next: docs => {
        this.documentosPorTarea[tareaId] = docs.map(d => this.normalizarDoc(d));
        this.cargandoDocumentos[tareaId] = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.documentosPorTarea[tareaId] = [];
        this.cargandoDocumentos[tareaId] = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Spring Boot puede serializar LocalDateTime como array [year,month,day,hour,min,sec,nano]
   * cuando no hay @JsonSerialize configurado. Este método lo convierte a ISO string
   * para que el pipe date de Angular funcione correctamente.
   */
  private normalizarDoc(doc: any): any {
    if (Array.isArray(doc.createdAt)) {
      const [y, mo, d, h, mi, s] = doc.createdAt;
      doc.createdAt = new Date(y, mo - 1, d, h ?? 0, mi ?? 0, s ?? 0).toISOString();
    }
    if (typeof doc.tamanoBytes === 'string') {
      doc.tamanoBytes = parseInt(doc.tamanoBytes, 10) || 0;
    }
    return doc;
  }

  onSeleccionarArchivo(event: Event, tarea: Task): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    // Validar formato si el nodo tiene restricciones
    if (tarea.formatosPermitidos && tarea.formatosPermitidos.length > 0) {
      const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
      
      const mapaExtensiones: Record<string, string[]> = {
        'pdf':   ['.pdf'],
        'word':  ['.doc', '.docx', '.rtf', '.odt'],
        'excel': ['.xls', '.xlsx', '.csv', '.ods'],
        'img':   ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'],
        'audio': ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'],
        'video': ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm'],
        'zip':   ['.zip', '.rar', '.7z', '.tar', '.gz'],
        'txt':   ['.txt', '.md', '.log'],
        'ppt':   ['.ppt', '.pptx', '.odp'],
      };

      const permitidosNorm = tarea.formatosPermitidos.flatMap(f => {
        const key = f.toLowerCase();
        return mapaExtensiones[key] ?? [`.${key}`];
      });

      if (!permitidosNorm.includes(ext)) {
        this.snackBar.open(
          `⚠️ Formato no permitido. Permitidos: ${tarea.formatosPermitidos.join(', ').toUpperCase()}`,
          'Cerrar',
          { duration: 4000, panelClass: 'snack-warn' }
        );
        input.value = '';
        return;
      }
    }

    this.subiendoArchivo[tarea.id] = true;
    this.documentService.uploadFile(tarea.procesoInstanciaId, file, tarea.id).subscribe({
      next: doc => {
        if (!this.documentosPorTarea[tarea.id]) {
          this.documentosPorTarea[tarea.id] = [];
        }
        this.documentosPorTarea[tarea.id].unshift(this.normalizarDoc(doc));
        this.subiendoArchivo[tarea.id] = false;
        this.snackBar.open('✅ Archivo subido correctamente', 'OK', { duration: 3000 });
        this.cdr.detectChanges();
      },
      error: () => {
        this.subiendoArchivo[tarea.id] = false;
        this.snackBar.open('❌ Error al subir el archivo', 'Cerrar', { duration: 4000 });
        this.cdr.detectChanges();
      }
    });
    input.value = '';
  }

  descargarArchivo(doc: Documento): void {
    this.documentService.downloadFile(doc.id, doc.nombreArchivo);
  }

  verArchivo(doc: Documento): void {
    this.documentService.getPresignedUrl(doc.id).subscribe({
      next: url => window.open(url, '_blank'),
      error: () => this.snackBar.open('Error al obtener URL de visualización', 'Cerrar', { duration: 3000 })
    });
  }

  triggerFileInput(tareaId: string): void {
    const input = document.getElementById(`file-input-${tareaId}`) as HTMLInputElement;
    input?.click();
  }

  abrirEnOnlyOffice(doc: Documento): void {
    this.router.navigate(['/editor', doc.id]);
  }

  /** Devuelve el accept de inputs según los formatos permitidos del nodo */
  getAcceptFormatos(tarea: Task): string {
    if (!tarea.formatosPermitidos || tarea.formatosPermitidos.length === 0) {
      // Sin restricción configurada: acepta cualquier tipo (el backend no filtra)
      return '*';
    }
    // Traducir cada categoría genérica a sus extensiones reales
    const mapaExtensiones: Record<string, string[]> = {
      'pdf':   ['.pdf'],
      'word':  ['.doc', '.docx', '.rtf', '.odt'],
      'excel': ['.xls', '.xlsx', '.csv', '.ods'],
      'img':   ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'],
      'audio': ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'],
      'video': ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm'],
      'zip':   ['.zip', '.rar', '.7z', '.tar', '.gz'],
      'txt':   ['.txt', '.md', '.log'],
      'ppt':   ['.ppt', '.pptx', '.odp'],
    };
    const extensiones = tarea.formatosPermitidos.flatMap(f => {
      const key = f.toLowerCase();
      // Si la categoría existe en el mapa, usa sus extensiones; si no, úsala tal cual
      return mapaExtensiones[key] ?? [`.${key}`];
    });
    return [...new Set(extensiones)].join(',');
  }

  /** Devuelve el texto de formatos permitidos para mostrar al usuario */
  getTextoFormatos(tarea: Task): string {
    if (!tarea.formatosPermitidos || tarea.formatosPermitidos.length === 0) {
      return 'Soporte para Word, Excel, PDF, imágenes, video...';
    }
    return `Formatos permitidos: ${tarea.formatosPermitidos.map(f => f.toUpperCase()).join(', ')}`;
  }

  /** Determina si el usuario puede editar con OnlyOffice según el permiso del nodo */
  puedeEditar(tarea: Task): boolean {
    return !tarea.permisoDefectoCreador || tarea.permisoDefectoCreador === 'EDITAR';
  }

  /** Icono del archivo según su extensión */
  getIconoArchivo(doc: Documento): string {
    const ext = doc.extension?.toLowerCase();
    if (['pdf'].includes(ext)) return 'picture_as_pdf';
    if (['doc', 'docx'].includes(ext)) return 'description';
    if (['xls', 'xlsx'].includes(ext)) return 'table_chart';
    if (['ppt', 'pptx'].includes(ext)) return 'slideshow';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi'].includes(ext)) return 'videocam';
    if (['mp3', 'wav'].includes(ext)) return 'audiotrack';
    return 'insert_drive_file';
  }

  /** Color del icono del archivo */
  getColorIcono(doc: Documento): string {
    const ext = doc.extension?.toLowerCase();
    if (['pdf'].includes(ext)) return '#ef4444';
    if (['doc', 'docx'].includes(ext)) return '#3b82f6';
    if (['xls', 'xlsx'].includes(ext)) return '#10b981';
    if (['ppt', 'pptx'].includes(ext)) return '#f97316';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '#8b5cf6';
    return '#64748b';
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  // ══════════════════════════════════════════════════════════════

  verTramite(tarea: Task): void {
    this.router.navigate(['/tramites', tarea.procesoInstanciaId]);
  }

  onFormularioGuardado(tarea: Task, campos: CampoFormulario[]): void {
    tarea.datosFormulario = campos;
    this.formulariosGuardados.add(tarea.id);
    this.snackBar.open('Formulario guardado correctamente', 'OK', { duration: 3000 });
    this.cdr.detectChanges();
  }

  formularioPendiente(tarea: Task): boolean {
    if (!tarea.formularioDinamicoHabilitado) return false;
    return !this.formulariosGuardados.has(tarea.id);
  }

  avanzar(tarea: Task): void {
    if (this.formularioPendiente(tarea)) {
      this.snackBar.open(
        '⚠️ Debes completar y guardar el formulario antes de avanzar',
        'Entendido',
        { duration: 4000, panelClass: 'snack-warn' }
      );
      return;
    }

    this.procesandoId = tarea.id;
    const observacion = this.observacionForm.get('observacion')?.value ?? '';

    this.instanceService.avanzar(tarea.procesoInstanciaId, { observacion }).subscribe({
      next: () => {
        this.taskService.completar(tarea.id, observacion).subscribe({
          next: actualizada => {
            const idx = this.tareas.findIndex(t => t.id === tarea.id);
            if (idx !== -1) this.tareas[idx] = actualizada;
            this.procesandoId = null;
            this.expandedId = null;
            this.observacionForm.reset();
            this.cdr.detectChanges();
            setTimeout(() => this.cargarTareas(), 800);
          },
          error: () => { this.procesandoId = null; this.cdr.detectChanges(); }
        });
      },
      error: () => { this.procesandoId = null; this.cdr.detectChanges(); }
    });
  }

  esTareaBandejaComun(tarea: Task): boolean {
    return !tarea.usuarioAsignadoId && (tarea.estado === 'PENDIENTE' || tarea.estado === 'EN_PROGRESO');
  }

  reclamar(tarea: Task): void {
    this.procesandoId = tarea.id;
    this.taskService.reclamar(tarea.id).subscribe({
      next: (actualizada) => {
        this.snackBar.open('✅ Has tomado la tarea. Ahora está en progreso para ti.', 'OK', { duration: 3000 });
        this.procesandoId = null;
        this.cargarTareas();
      },
      error: (err) => {
        this.procesandoId = null;
        const msg = err.error?.message || 'intente de nuevo';
        this.snackBar.open('❌ Error al reclamar la tarea: ' + msg, 'Cerrar', { duration: 4000 });
        this.cdr.detectChanges();
      }
    });
  }

  get pendientes(): Task[] { return this.tareas.filter(t => (t.estado === 'PENDIENTE' || t.estado === 'EN_PROGRESO') && !this.esTareaBandejaComun(t)); }
  get bandejaComun(): Task[] { return this.tareas.filter(t => this.esTareaBandejaComun(t)); }
  get completadas(): Task[] { return this.tareas.filter(t => t.estado === 'COMPLETADO'); }

  getEstadoColor(estado: string): 'primary' | 'accent' | 'warn' | '' {
    const map: Record<string, 'primary' | 'accent' | 'warn' | ''> = {
      PENDIENTE: 'primary', EN_PROGRESO: 'primary', COMPLETADO: 'accent', RECHAZADO: 'warn'
    };
    return map[estado] ?? '';
  }

  getEstadoIcono(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'radio_button_unchecked', EN_PROGRESO: 'pending',
      COMPLETADO: 'check_circle', RECHAZADO: 'cancel'
    };
    return map[estado] ?? 'help';
  }
}
