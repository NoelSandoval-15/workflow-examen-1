import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkflowTemplateService } from '../../services/workflow-template.service';
import { WorkflowInstanceService } from '../../services/workflow-instance.service';
import { BpmnViewerComponent } from '../../components/bpmn-viewer/bpmn-viewer.component';
import { WorkflowTemplate } from '../../models/workflow.model';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
    BpmnViewerComponent
  ],
  templateUrl: './template-list.component.html',
  styleUrl: './template-list.component.scss'
})
export class TemplateListComponent implements OnInit {
  templates: WorkflowTemplate[] = [];
  loading = true;
  selectedTemplate?: WorkflowTemplate;
  procesando: string | null = null;

  constructor(
    private templateService: WorkflowTemplateService,
    private instanceService: WorkflowInstanceService,
    private router: Router,
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
      },
      error: () => { this.procesando = null; }
    });
  }

  iniciarTramite(template: WorkflowTemplate, event: Event): void {
    event.stopPropagation();
    this.procesando = template.id;
    this.instanceService.iniciar({ templateId: template.id }).subscribe({
      next: () => { this.procesando = null; alert('Trámite iniciado correctamente'); },
      error: () => { this.procesando = null; }
    });
  }

  crearFlujo(): void {
    this.router.navigate(['/flujos/nuevo']);
  }

  getEstadoColor(estado: string): string {
    return estado === 'ACTIVO' ? 'accent' : estado === 'BORRADOR' ? '' : 'warn';
  }
}
