import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WorkflowTemplateService } from '../../services/workflow-template.service';
import { WorkflowInstanceService } from '../../services/workflow-instance.service';
import { WorkflowCollaborationService, CollaborationLinkDTO } from '../../services/workflow-collaboration.service';
import { BpmnViewerComponent } from '../../components/bpmn-viewer/bpmn-viewer.component';
import { WorkflowTemplate } from '../../models/workflow.model';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
    MatSnackBarModule, BpmnViewerComponent
  ],
  templateUrl: './template-list.component.html',
  styleUrl: './template-list.component.scss'
})
export class TemplateListComponent implements OnInit {
  templates: WorkflowTemplate[] = [];
  loading = true;
  selectedTemplate?: WorkflowTemplate;
  procesando: string | null = null;

  /** Panel de compartir: muestra el link del template activo */
  compartirPanel: { templateId: string; link: CollaborationLinkDTO } | null = null;
  cargandoLink = false;

  constructor(
    private templateService: WorkflowTemplateService,
    private instanceService: WorkflowInstanceService,
    private collaborationService: WorkflowCollaborationService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.templateService.listar().subscribe({
      next: data => { this.templates = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  seleccionar(template: WorkflowTemplate): void {
    this.selectedTemplate = this.selectedTemplate?.id === template.id ? undefined : template;
  }

  activar(template: WorkflowTemplate, event: Event): void {
    event.stopPropagation();
    this.procesando = template.id;
    this.templateService.activar(template.id).subscribe({
      next: actualizado => {
        const idx = this.templates.findIndex(t => t.id === template.id);
        if (idx !== -1) this.templates[idx] = actualizado;
        if (this.selectedTemplate?.id === template.id) this.selectedTemplate = actualizado;
        this.procesando = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.procesando = null;
        this.cdr.detectChanges();
        alert('Error: ' + (err?.error?.message || 'Error al activar el flujo'));
      }
    });
  }

  iniciarTramite(template: WorkflowTemplate, event: Event): void {
    event.stopPropagation();
    this.procesando = template.id;
    this.instanceService.iniciar({ templateId: template.id }).subscribe({
      next: (instancia) => {
        this.procesando = null;
        this.cdr.detectChanges();
        alert('Trámite iniciado: ' + instancia.codigo);
      },
      error: (err) => {
        this.procesando = null;
        this.cdr.detectChanges();
        alert('Error: ' + (err?.error?.message || 'Error al iniciar trámite'));
      }
    });
  }

  editar(template: WorkflowTemplate, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/flujos/editar', template.id]);
  }

  // ── Colaboración ──────────────────────────────────────────────

  abrirCompartir(template: WorkflowTemplate, event: Event): void {
    event.stopPropagation();
    if (this.compartirPanel?.templateId === template.id) {
      this.compartirPanel = null; // toggle cerrar
      return;
    }
    this.cargandoLink = true;
    this.collaborationService.generarLink(template.id).subscribe({
      next: link => {
        this.compartirPanel = { templateId: template.id, link };
        this.cargandoLink = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoLink = false; this.cdr.detectChanges(); }
    });
  }

  copiarLink(): void {
    if (!this.compartirPanel) return;
    navigator.clipboard.writeText(this.compartirPanel.link.collaborationUrl).then(() => {
      this.snackBar.open('✓ Link copiado al portapapeles', '', { duration: 2500 });
    });
  }

  regenerarLink(): void {
    if (!this.compartirPanel) return;
    const templateId = this.compartirPanel.templateId;
    this.cargandoLink = true;
    this.collaborationService.regenerarLink(templateId).subscribe({
      next: link => {
        this.compartirPanel = { templateId, link };
        this.cargandoLink = false;
        this.cdr.detectChanges();
        this.snackBar.open('Link regenerado', '', { duration: 2000 });
      },
      error: () => { this.cargandoLink = false; this.cdr.detectChanges(); }
    });
  }

  revocarLink(): void {
    if (!this.compartirPanel) return;
    const templateId = this.compartirPanel.templateId;
    this.collaborationService.revocarLink(templateId).subscribe({
      next: () => {
        this.compartirPanel = null;
        this.cdr.detectChanges();
        this.snackBar.open('Colaboración desactivada', '', { duration: 2000 });
      },
      error: () => {}
    });
  }

  cerrarCompartir(): void { this.compartirPanel = null; }

  // ─────────────────────────────────────────────────────────────

  crearFlujo(): void { this.router.navigate(['/flujos/nuevo']); }

  getEstadoColor(estado: string): string {
    return estado === 'ACTIVO' ? 'accent' : estado === 'BORRADOR' ? '' : 'warn';
  }
}
