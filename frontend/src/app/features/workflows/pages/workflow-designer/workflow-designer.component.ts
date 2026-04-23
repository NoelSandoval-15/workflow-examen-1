import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkflowTemplateService } from '../../services/workflow-template.service';
import { BpmnModelerComponent, NodoSeleccionado } from '../../components/bpmn-modeler/bpmn-modeler.component';
import { AdminService, Departamento } from '../../../admin/services/admin.service';

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCheckboxModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule, BpmnModelerComponent
  ],
  templateUrl: './workflow-designer.component.html',
  styleUrl: './workflow-designer.component.scss'
})
export class WorkflowDesignerComponent implements OnInit {
  @ViewChild('modeler') modelerRef!: BpmnModelerComponent;

  form: FormGroup;
  propForm: FormGroup;
  guardando = false;
  nodoSeleccionado: NodoSeleccionado | null = null;
  departamentos: Departamento[] = [];

  readonly roles = [
    { id: 'ADMIN',       label: 'Administrador' },
    { id: 'SUPERVISOR',  label: 'Supervisor'     },
    { id: 'FUNCIONARIO', label: 'Funcionario'    }
  ];

  constructor(
    private fb: FormBuilder,
    private templateService: WorkflowTemplateService,
    private adminService: AdminService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nombre:        ['', Validators.required],
      tipoSolicitud: ['', Validators.required]
    });
    this.propForm = this.fb.group({
      nombre:            ['', Validators.required],
      departamentoId:    [''],
      rolRequerido:      [''],
      tiempoLimiteHoras: [24],
      requiereEvidencia: [false]
    });
  }

  ngOnInit(): void {
    this.adminService.listarDepartamentos().subscribe({
      next: data => { this.departamentos = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  onElementoSeleccionado(nodo: NodoSeleccionado): void {
    this.nodoSeleccionado = nodo;
    this.propForm.patchValue({
      nombre:            nodo.nombre,
      departamentoId:    nodo.departamentoId    ?? '',
      rolRequerido:      nodo.rolRequerido      ?? '',
      tiempoLimiteHoras: nodo.tiempoLimiteHoras ?? 24,
      requiereEvidencia: nodo.requiereEvidencia ?? false
    });
    this.cdr.detectChanges();
  }

  guardarPropiedades(): void {
    if (!this.nodoSeleccionado || this.propForm.invalid) return;
    const datos: NodoSeleccionado = { ...this.nodoSeleccionado, ...this.propForm.value };
    this.modelerRef.actualizarNodo(datos.id, datos);
    this.nodoSeleccionado = datos;
    this.snackBar.open('Propiedades aplicadas', '', { duration: 1500 });
  }

  cerrarPanel(): void {
    this.nodoSeleccionado = null;
  }

  getTipoColor(tipo: string): string {
    const map: Record<string, string> = {
      'bpmn:StartEvent':      '#10b981',
      'bpmn:EndEvent':        '#64748b',
      'bpmn:UserTask':        '#3b82f6',
      'bpmn:Task':            '#3b82f6',
      'bpmn:ServiceTask':     '#8b5cf6',
      'bpmn:ManualTask':      '#f59e0b',
      'bpmn:ExclusiveGateway':'#f97316',
      'bpmn:ParallelGateway': '#06b6d4'
    };
    return map[tipo] ?? '#94a3b8';
  }

  getTipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      'bpmn:StartEvent':      'Inicio del Proceso',
      'bpmn:EndEvent':        'Fin del Proceso',
      'bpmn:UserTask':        'Tarea de Usuario',
      'bpmn:Task':            'Tarea',
      'bpmn:ServiceTask':     'Servicio Automático',
      'bpmn:ManualTask':      'Tarea Manual',
      'bpmn:ExclusiveGateway':'Decisión (Gateway)',
      'bpmn:ParallelGateway': 'Paralelo (Gateway)'
    };
    return map[tipo] ?? tipo;
  }

  getTipoIcono(tipo: string): string {
    const map: Record<string, string> = {
      'bpmn:StartEvent':      'play_circle',
      'bpmn:EndEvent':        'stop_circle',
      'bpmn:UserTask':        'person',
      'bpmn:Task':            'task_alt',
      'bpmn:ServiceTask':     'settings',
      'bpmn:ManualTask':      'back_hand',
      'bpmn:ExclusiveGateway':'call_split',
      'bpmn:ParallelGateway': 'device_hub'
    };
    return map[tipo] ?? 'radio_button_unchecked';
  }

  esSoloLectura(tipo: string): boolean {
    return tipo === 'bpmn:StartEvent' || tipo === 'bpmn:EndEvent';
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.snackBar.open('Completa nombre y tipo de solicitud', 'OK', { duration: 3000 });
      return;
    }
    const { nodos, conexiones } = this.modelerRef.extractData();
    if (nodos.length === 0) {
      this.snackBar.open('El diagrama no tiene nodos', 'OK', { duration: 3000 });
      return;
    }
    this.guardando = true;

    // Exportar el BPMN 2.0 XML real de bpmn.js para que Camunda lo ejecute
    let bpmnXml: string | undefined;
    try {
      bpmnXml = await this.modelerRef.exportXml();
    } catch {
      bpmnXml = undefined;
    }

    this.templateService.crear({ ...this.form.value, nodos, conexiones, bpmnXml }).subscribe({
      next: () => {
        this.snackBar.open('Flujo guardado correctamente', 'OK', { duration: 2500 });
        this.router.navigate(['/flujos']);
      },
      error: () => {
        this.snackBar.open('Error al guardar el flujo', 'OK', { duration: 3000 });
        this.guardando = false;
      }
    });
  }

  volver(): void {
    this.router.navigate(['/flujos']);
  }
}
