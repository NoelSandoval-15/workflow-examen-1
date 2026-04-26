import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
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
import { WorkflowCollaborationService, CollaborationLinkDTO } from '../../services/workflow-collaboration.service';
import { WorkflowRealtimeService } from '../../services/workflow-realtime.service';
import { BpmnModelerComponent, NodoSeleccionado } from '../../components/bpmn-modeler/bpmn-modeler.component';
import { AdminService, Departamento, User } from '../../../admin/services/admin.service';
import { WorkflowTemplate, WorkflowNode, WorkflowEdge } from '../../models/workflow.model';

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
export class WorkflowDesignerComponent implements OnInit, OnDestroy {
  @ViewChild('modeler') modelerRef!: BpmnModelerComponent;

  form: FormGroup;
  propForm: FormGroup;
  guardando = false;
  nodoSeleccionado: NodoSeleccionado | null = null;
  departamentos: Departamento[] = [];
  todosLosFuncionarios: User[] = [];

  // Modo de la pantalla
  templateId: string | null = null;
  collaborationToken: string | null = null;
  isCollaborationMode = false;

  modelerListo = false;
  xmlParaCargar?: string;

  // Panel de compartir
  mostrarPanelCompartir = false;
  linkColaboracion: CollaborationLinkDTO | null = null;
  cargandoLink = false;

  // ── Colaboración en tiempo real ──────────────────────────────
  /** ID único por sesión de navegador — identifica al cliente en la sala */
  readonly clientId = crypto.randomUUID();
  private collaborationVersion = 0;
  /** Debounce: espera 400ms de inactividad antes de enviar el XML */
  private readonly xmlSubject = new Subject<string>();
  private realtimeSub?: Subscription;

  readonly roles = [
    { id: 'ADMIN',       label: 'Administrador' },
    { id: 'SUPERVISOR',  label: 'Supervisor'     },
    { id: 'FUNCIONARIO', label: 'Funcionario'    }
  ];

  get funcionariosFiltrados(): User[] {
    const deptId = this.propForm.get('departamentoId')?.value;
    if (!deptId) return this.todosLosFuncionarios;
    return this.todosLosFuncionarios.filter(u => u.departamentoId === deptId);
  }

  getNombreDepartamento(id: string): string {
    return this.departamentos.find(d => d.id === id)?.nombre ?? id;
  }

  constructor(
    private fb: FormBuilder,
    private templateService: WorkflowTemplateService,
    private collaborationService: WorkflowCollaborationService,
    private realtimeService: WorkflowRealtimeService,
    private adminService: AdminService,
    private route: ActivatedRoute,
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
      funcionarioId:     [''],
      tiempoLimiteHoras: [24],
      requiereEvidencia: [false]
    });
  }

  ngOnInit(): void {
    this.adminService.listarUsuarios().subscribe({
      next: users => {
        this.todosLosFuncionarios = users.filter(u => u.rolId?.toUpperCase() === 'FUNCIONARIO');
        this.cdr.detectChanges();
      },
      error: () => {}
    });
    this.adminService.listarDepartamentos().subscribe({
      next: data => { this.departamentos = data; this.cdr.detectChanges(); },
      error: () => {}
    });

    // Detectar modo: crear | editar | colaborar
    this.templateId          = this.route.snapshot.paramMap.get('id');
    this.collaborationToken  = this.route.snapshot.paramMap.get('token');

    if (this.collaborationToken) {
      // ── Modo colaboración: cargar flujo por token (sin JWT) ──
      this.isCollaborationMode = true;
      this.collaborationService.resolverToken(this.collaborationToken).subscribe({
        next: session => {
          this.templateId = session.templateId;
          this.form.patchValue({
            nombre:        session.templateNombre,
            tipoSolicitud: session.tipoSolicitud ?? ''
          });
          this.xmlParaCargar = session.bpmnXml ?? this.generarXmlDesdeNodos(session);
          this.conectarSalaRealtime(session.templateId);
          setTimeout(() => { this.modelerListo = true; this.cdr.detectChanges(); }, 0);
        },
        error: () => {
          this.snackBar.open('Link inválido o revocado', 'OK', { duration: 4000 });
          this.router.navigate(['/dashboard']);
        }
      });
      return;
    }

    if (!this.templateId) {
      // ── Modo creación: sin sala hasta que se guarde ──
      this.modelerListo = true;
      return;
    }

    // ── Modo edición: conectar sala para que el dueño también sincronice ──
    this.templateService.obtener(this.templateId).subscribe({
      next: (t: WorkflowTemplate) => {
        this.form.patchValue({ nombre: t.nombre, tipoSolicitud: t.tipoSolicitud ?? '' });
        this.xmlParaCargar = t.bpmnXml?.trim() ? t.bpmnXml : this.generarXmlDesdeTemplate(t);
        this.conectarSalaRealtime(t.id);
        setTimeout(() => { this.modelerListo = true; this.cdr.detectChanges(); }, 0);
      },
      error: () => {
        setTimeout(() => { this.modelerListo = true; this.cdr.detectChanges(); }, 0);
      }
    });
  }

  // ── Panel Compartir ───────────────────────────────────────────

  toggleCompartir(): void {
    if (this.mostrarPanelCompartir) {
      this.mostrarPanelCompartir = false;
      return;
    }
    if (!this.templateId) {
      this.snackBar.open('Guarda el flujo primero para poder compartirlo', 'OK', { duration: 3000 });
      return;
    }
    this.cargandoLink = true;
    this.mostrarPanelCompartir = true;
    this.collaborationService.generarLink(this.templateId).subscribe({
      next: link => {
        this.linkColaboracion = link;
        this.cargandoLink = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoLink = false; this.mostrarPanelCompartir = false; this.cdr.detectChanges(); }
    });
  }

  copiarLink(): void {
    if (!this.linkColaboracion) return;
    navigator.clipboard.writeText(this.linkColaboracion.collaborationUrl).then(() => {
      this.snackBar.open('✓ Link copiado', '', { duration: 2000 });
    });
  }

  regenerarLink(): void {
    if (!this.templateId) return;
    this.cargandoLink = true;
    this.collaborationService.regenerarLink(this.templateId).subscribe({
      next: link => {
        this.linkColaboracion = link;
        this.cargandoLink = false;
        this.cdr.detectChanges();
        this.snackBar.open('Link regenerado', '', { duration: 2000 });
      },
      error: () => { this.cargandoLink = false; this.cdr.detectChanges(); }
    });
  }

  revocarLink(): void {
    if (!this.templateId) return;
    this.collaborationService.revocarLink(this.templateId).subscribe({
      next: () => {
        this.linkColaboracion = null;
        this.mostrarPanelCompartir = false;
        this.cdr.detectChanges();
        this.snackBar.open('Colaboración desactivada', '', { duration: 2000 });
      },
      error: () => {}
    });
  }

  // ── Propiedades de nodo ───────────────────────────────────────

  onElementoSeleccionado(nodo: NodoSeleccionado): void {
    this.nodoSeleccionado = nodo;
    this.propForm.patchValue({
      nombre:            nodo.nombre,
      departamentoId:    nodo.departamentoId    ?? '',
      rolRequerido:      nodo.rolRequerido      ?? '',
      funcionarioId:     nodo.funcionarioId     ?? '',
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

  cerrarPanel(): void { this.nodoSeleccionado = null; }

  // ── Guardar ───────────────────────────────────────────────────

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

    let bpmnXml: string | undefined;
    try { bpmnXml = await this.modelerRef.exportXml(); } catch { bpmnXml = undefined; }

    const request = { ...this.form.value, nodos, conexiones, bpmnXml };

    const operacion = this.templateId
      ? this.templateService.actualizar(this.templateId, request)
      : this.templateService.crear(request);

    operacion.subscribe({
      next: (saved) => {
        this.templateId = saved.id; // si era creación, ahora tenemos el id
        const msg = this.isCollaborationMode
          ? 'Cambios guardados'
          : (this.templateId ? 'Flujo actualizado' : 'Flujo guardado');
        this.snackBar.open(msg + ' correctamente', 'OK', { duration: 2500 });
        if (!this.isCollaborationMode) this.router.navigate(['/flujos']);
        else this.guardando = false;
      },
      error: () => {
        this.snackBar.open('Error al guardar el flujo', 'OK', { duration: 3000 });
        this.guardando = false;
      }
    });
  }

  volver(): void { this.router.navigate(['/flujos']); }

  // ── Colaboración en tiempo real ───────────────────────────────

  /** Conecta a la sala STOMP y suscribe a eventos remotos */
  private conectarSalaRealtime(workflowId: string): void {
    this.realtimeService.connect(workflowId);

    // Recibir eventos de otros colaboradores
    this.realtimeSub = this.realtimeService.remoteEvent$.subscribe(event => {
      if (event.type !== 'BPMN_XML_CHANGED') return;
      if (event.clientId === this.clientId) return;           // ignorar los propios
      if ((event.version ?? 0) < this.collaborationVersion) return; // ignorar viejos
      this.collaborationVersion = event.version ?? 0;
      if (event.bpmnXml && this.modelerRef) {
        this.modelerRef.aplicarXmlRemoto(event.bpmnXml);
      }
    });

    // Debounce: enviar cambio local 400ms después de la última edición
    this.xmlSubject.pipe(debounceTime(400)).subscribe(xml => {
      if (!this.templateId) return;
      this.collaborationVersion++;
      this.realtimeService.sendBpmnChange(
        this.templateId, this.clientId,
        'colaborador', this.collaborationVersion, xml
      );
    });
  }

  /** Llamado desde (xmlChanged) del BpmnModelerComponent */
  onXmlChanged(xml: string): void {
    if (this.templateId) this.xmlSubject.next(xml);
  }

  ngOnDestroy(): void {
    if (this.templateId) {
      this.realtimeService.sendPresence(this.templateId, this.clientId, 'colaborador', 'LEAVE');
    }
    this.realtimeSub?.unsubscribe();
    this.xmlSubject.complete();
    this.realtimeService.disconnect();
  }

  // ── Helpers tipo/color/icono ──────────────────────────────────

  getTipoColor(tipo: string): string {
    const m: Record<string,string> = {
      'bpmn:StartEvent':'#10b981','bpmn:EndEvent':'#64748b',
      'bpmn:UserTask':'#3b82f6','bpmn:Task':'#3b82f6',
      'bpmn:ServiceTask':'#8b5cf6','bpmn:ManualTask':'#f59e0b',
      'bpmn:ExclusiveGateway':'#f97316','bpmn:ParallelGateway':'#06b6d4'
    };
    return m[tipo] ?? '#94a3b8';
  }
  getTipoLabel(tipo: string): string {
    const m: Record<string,string> = {
      'bpmn:StartEvent':'Inicio del Proceso','bpmn:EndEvent':'Fin del Proceso',
      'bpmn:UserTask':'Tarea de Usuario','bpmn:Task':'Tarea',
      'bpmn:ServiceTask':'Servicio Automático','bpmn:ManualTask':'Tarea Manual',
      'bpmn:ExclusiveGateway':'Decisión (Gateway)','bpmn:ParallelGateway':'Paralelo (Gateway)'
    };
    return m[tipo] ?? tipo;
  }
  getTipoIcono(tipo: string): string {
    const m: Record<string,string> = {
      'bpmn:StartEvent':'play_circle','bpmn:EndEvent':'stop_circle',
      'bpmn:UserTask':'person','bpmn:Task':'task_alt',
      'bpmn:ServiceTask':'settings','bpmn:ManualTask':'back_hand',
      'bpmn:ExclusiveGateway':'call_split','bpmn:ParallelGateway':'device_hub'
    };
    return m[tipo] ?? 'radio_button_unchecked';
  }
  esSoloLectura(tipo: string): boolean {
    return tipo === 'bpmn:StartEvent' || tipo === 'bpmn:EndEvent';
  }

  // ── Generadores XML ───────────────────────────────────────────

  private generarXmlDesdeNodos(session: { nodos: WorkflowNode[]; conexiones: WorkflowEdge[]; templateId: string }): string {
    return this.generarXmlDesdeTemplate({
      id: session.templateId, nodos: session.nodos, conexiones: session.conexiones
    } as WorkflowTemplate);
  }

  private generarXmlDesdeTemplate(t: WorkflowTemplate): string {
    const nodoBpmn = (n: WorkflowNode): string => {
      const name = n.nombre.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const inc = t.conexiones.filter(e => e.nodoDestinoId === n.id).map(e => `<incoming>${e.id}</incoming>`).join('');
      const out = t.conexiones.filter(e => e.nodoOrigenId === n.id).map(e => `<outgoing>${e.id}</outgoing>`).join('');
      switch (n.tipo) {
        case 'INICIO':   return `<startEvent id="${n.id}" name="${name}">${out}</startEvent>`;
        case 'FIN':      return `<endEvent id="${n.id}" name="${name}">${inc}</endEvent>`;
        case 'DECISION': return `<exclusiveGateway id="${n.id}" name="${name}">${inc}${out}</exclusiveGateway>`;
        case 'PARALELO': return `<parallelGateway id="${n.id}" name="${name}">${inc}${out}</parallelGateway>`;
        default:         return `<userTask id="${n.id}" name="${name}">${inc}${out}</userTask>`;
      }
    };
    const edgeBpmn = (e: WorkflowEdge) =>
      `<sequenceFlow id="${e.id}" sourceRef="${e.nodoOrigenId}" targetRef="${e.nodoDestinoId}"${e.etiqueta?` name="${e.etiqueta}"`:''}/>`;

    const STEP = 180, SX = 100, CY = 220;
    const sorted = [...t.nodos].sort((a,b) => (a.orden??0)-(b.orden??0));
    const shapes = sorted.map((n,i) => {
      const w = (n.tipo==='INICIO'||n.tipo==='FIN')?36:(n.tipo==='DECISION'||n.tipo==='PARALELO')?50:120;
      const h = (n.tipo==='INICIO'||n.tipo==='FIN')?36:(n.tipo==='DECISION'||n.tipo==='PARALELO')?50:80;
      return `<bpmndi:BPMNShape bpmnElement="${n.id}"><dc:Bounds x="${SX+i*STEP}" y="${CY-h/2}" width="${w}" height="${h}"/></bpmndi:BPMNShape>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  targetNamespace="http://workflow">
  <process id="proc_${t.id}" isExecutable="false">
    ${t.nodos.map(nodoBpmn).join('\n    ')}
    ${t.conexiones.map(edgeBpmn).join('\n    ')}
  </process>
  <bpmndi:BPMNDiagram>
    <bpmndi:BPMNPlane bpmnElement="proc_${t.id}">${shapes}</bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;
  }
}
