import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { WorkflowInstanceService } from '../../services/workflow-instance.service';
import { WorkflowTemplateService } from '../../services/workflow-template.service';
import { BpmnViewerComponent } from '../../components/bpmn-viewer/bpmn-viewer.component';
import { HistoryTimelineComponent } from '../../components/history-timeline/history-timeline.component';
import { ProcesoInstancia, WorkflowTemplate, WorkflowEdge } from '../../models/workflow.model';

@Component({
  selector: 'app-instance-detail',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatProgressSpinnerModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    BpmnViewerComponent, HistoryTimelineComponent
  ],
  templateUrl: './instance-detail.component.html',
  styleUrl: './instance-detail.component.scss'
})
export class InstanceDetailComponent implements OnInit {
  instancia?: ProcesoInstancia;
  template?: WorkflowTemplate;
  loading = true;
  procesando = false;

  avanzarForm: FormGroup;
  mostrarFormAvanzar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private instanceService: WorkflowInstanceService,
    private templateService: WorkflowTemplateService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.avanzarForm = this.fb.group({
      conexionId: [''],   // id de la conexión elegida (para obtener la condicion real)
      observacion: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.instanceService.obtener(id).subscribe({
      next: inst => {
        this.instancia = inst;
        this.loading = false;
        this.cdr.detectChanges();
        if (inst.templateId) {
          this.templateService.obtener(inst.templateId).subscribe({
            next: tmpl => { this.template = tmpl; this.cdr.detectChanges(); },
            error: () => {}
          });
        }
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  get conexionesDelNodoActual(): (WorkflowEdge & { labelVisible: string })[] {
    if (!this.template || !this.instancia?.nodoActual) return [];
    return this.template.conexiones
      .filter(c => c.nodoOrigenId === this.instancia!.nodoActual!.id)
      .map((c, i) => {
        const nodoDestino = this.template!.nodos.find(n => n.id === c.nodoDestinoId);
        const base = c.etiqueta ?? c.condicion;
        const dest = nodoDestino?.nombre ?? '';
        const labelVisible = base ? `${base} → ${dest}` : `Opción ${i + 1}: → ${dest}`;
        return { ...c, labelVisible };
      });
  }

  /** Valor de condicion que se enviará al backend según la conexión seleccionada */
  getCondicionDeConexion(conexionId: string): string {
    const c = this.conexionesDelNodoActual.find(x => x.id === conexionId);
    return c?.condicion ?? '';
  }

  getNombreNodo(nodoId: string): string {
    return this.template?.nodos.find(n => n.id === nodoId)?.nombre ?? nodoId;
  }

  get estaFinalizado(): boolean {
    return ['COMPLETADO', 'RECHAZADO', 'CANCELADO'].includes(this.instancia?.estadoActual ?? '');
  }

  esPasado(nodoId: string): boolean {
    if (!this.instancia?.historialResumen) return false;
    const enHistorial = this.instancia.historialResumen.some(h => h.nodoId === nodoId);
    const esActual = this.instancia.nodoActual?.id === nodoId;
    return enHistorial && !esActual;
  }

  avanzar(): void {
    if (!this.instancia) return;
    this.procesando = true;
    const conexionId = this.avanzarForm.get('conexionId')?.value;
    const condicion = conexionId ? this.getCondicionDeConexion(conexionId) : '';
    const observacion = this.avanzarForm.get('observacion')?.value ?? '';
    this.instanceService.avanzar(this.instancia.id, { condicion, observacion }).subscribe({
      next: actualizada => {
        this.instancia = actualizada;
        this.mostrarFormAvanzar = false;
        this.avanzarForm.reset({ conexionId: '', observacion: '' });
        this.procesando = false;
        this.cdr.detectChanges();
        this.templateService.obtener(actualizada.templateId).subscribe(t => { this.template = t; this.cdr.detectChanges(); });
      },
      error: () => { this.procesando = false; this.cdr.detectChanges(); }
    });
  }

  rechazar(): void {
    if (!this.instancia) return;
    const motivo = this.avanzarForm.get('observacion')?.value || 'Sin motivo';
    this.procesando = true;
    this.instanceService.rechazar(this.instancia.id, motivo).subscribe({
      next: actualizada => { this.instancia = actualizada; this.procesando = false; this.cdr.detectChanges(); },
      error: () => { this.procesando = false; this.cdr.detectChanges(); }
    });
  }

  volver(): void {
    this.router.navigate(['/tramites']);
  }
}
