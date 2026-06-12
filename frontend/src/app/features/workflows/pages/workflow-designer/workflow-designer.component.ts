import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCheckboxModule, MatSlideToggleModule, MatSnackBarModule, MatProgressSpinnerModule,
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
  nodosParaCargar?: WorkflowNode[];

  // Panel de compartir
  mostrarPanelCompartir = false;
  linkColaboracion: CollaborationLinkDTO | null = null;
  cargandoLink = false;

  // IA y Voz
  aiPrompt = '';
  cargandoIA = false;
  escuchandoIA = false;
  private recognition: any;

  // ── Colaboración en tiempo real ──────────────────────────────
  /** ID único por sesión de navegador — identifica al cliente en la sala */
  readonly clientId = this.generateClientId();
  private collaborationVersion = 0;
  /** Debounce: espera 400ms de inactividad antes de enviar el XML */
  private readonly xmlSubject = new Subject<string>();
  private realtimeSub?: Subscription;

  readonly roles = [
    { id: 'ADMIN',       label: 'Administrador' },
    { id: 'SUPERVISOR',  label: 'Supervisor'     },
    { id: 'FUNCIONARIO', label: 'Funcionario'    }
  ];

  private generateClientId(): string {
    // Generar un UUID v4 compatible sin crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

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
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private ngZone: NgZone
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
      fechaLimite:       [''],
      requiereEvidencia: [false],
      formularioDinamicoHabilitado: [false],
      permisoDefectoCreador: ['EDITAR'],
      nivelVisibilidadGlobal: ['PRIVADO'],
      bloquearAlCompletar: [false],
      habilitarFirmaDigital: [false],
      permitePdf: [true],
      permiteWord: [true],
      permiteExcel: [true],
      permiteImagenes: [true],
      permiteAudio: [false],
      permiteVideo: [false],
      matrizPermisosDocumentos: [[]]
    });

    // Inicializar reconocimiento de voz si está disponible en el navegador
    const { webkitSpeechRecognition, SpeechRecognition } = window as any;
    const SpeechRec = SpeechRecognition || webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.lang = 'es-BO';
      this.recognition.interimResults = false;
      this.recognition.onresult = (event: any) => {
        this.ngZone.run(() => {
          setTimeout(() => {
            this.aiPrompt = event.results[0][0].transcript;
            this.escuchandoIA = false;
            this.cdr.detectChanges();
            this.generarFlujoIA();
          }, 0);
        });
      };
      this.recognition.onerror = (err: any) => {
        console.error('Error de reconocimiento de voz', err);
        this.ngZone.run(() => {
          setTimeout(() => {
            this.escuchandoIA = false;
            this.cdr.detectChanges();
          }, 0);
        });
      };
      this.recognition.onend = () => {
        this.ngZone.run(() => {
          setTimeout(() => {
            this.escuchandoIA = false;
            this.cdr.detectChanges();
          }, 0);
        });
      };
    }
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
          this.nodosParaCargar = session.nodos;
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
        this.nodosParaCargar = t.nodos;
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

    if (this.templateId) {
      // Ya existe el flujo → generar link directamente
      this.abrirPanelConLink(this.templateId);
    } else {
      // Flujo nuevo → guardar en silencio primero, luego compartir
      if (this.form.invalid) {
        this.snackBar.open('Completa el nombre y tipo de solicitud antes de compartir', 'OK', { duration: 3000 });
        return;
      }
      this.guardarSilenciosoYCompartir();
    }
  }

  private guardarSilenciosoYCompartir(): void {
    this.cargandoLink = true;
    this.mostrarPanelCompartir = true;

    const { nodos, conexiones } = this.modelerRef?.extractData() ?? { nodos: [], conexiones: [] };
    this.modelerRef?.exportXml().then(bpmnXml => {
      const request = { ...this.form.value, nodos, conexiones, bpmnXml };
      this.templateService.crear(request).subscribe({
        next: saved => {
          this.templateId = saved.id;
          this.conectarSalaRealtime(saved.id);
          this.snackBar.open('Flujo guardado. Generando link…', '', { duration: 1500 });
          this.abrirPanelConLink(saved.id);
        },
        error: () => {
          this.cargandoLink = false;
          this.mostrarPanelCompartir = false;
          this.cdr.detectChanges();
          this.snackBar.open('Error al guardar el flujo', 'OK', { duration: 3000 });
        }
      });
    }).catch(() => {
      this.cargandoLink = false;
      this.mostrarPanelCompartir = false;
    });
  }

  private abrirPanelConLink(templateId: string): void {
    this.cargandoLink = true;
    this.mostrarPanelCompartir = true;
    this.collaborationService.generarLink(templateId).subscribe({
      next: link => {
        this.linkColaboracion = link;
        this.cargandoLink = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoLink = false;
        this.mostrarPanelCompartir = false;
        this.cdr.detectChanges();
      }
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
      fechaLimite:       nodo.fechaLimite       ?? '',
      requiereEvidencia: nodo.requiereEvidencia ?? false,
      formularioDinamicoHabilitado: nodo.formularioDinamicoHabilitado ?? false,
      permisoDefectoCreador: nodo.permisoDefectoCreador ?? 'EDITAR',
      nivelVisibilidadGlobal: nodo.nivelVisibilidadGlobal ?? 'PRIVADO',
      bloquearAlCompletar: nodo.bloquearAlCompletar ?? false,
      habilitarFirmaDigital: nodo.habilitarFirmaDigital ?? false,
      permitePdf: nodo.formatosPermitidos ? nodo.formatosPermitidos.includes('PDF') : true,
      permiteWord: nodo.formatosPermitidos ? nodo.formatosPermitidos.includes('WORD') : true,
      permiteExcel: nodo.formatosPermitidos ? nodo.formatosPermitidos.includes('EXCEL') : true,
      permiteImagenes: nodo.formatosPermitidos ? nodo.formatosPermitidos.includes('IMG') : true,
      permiteAudio: nodo.formatosPermitidos ? nodo.formatosPermitidos.includes('AUDIO') : false,
      permiteVideo: nodo.formatosPermitidos ? nodo.formatosPermitidos.includes('VIDEO') : false,
      matrizPermisosDocumentos: nodo.matrizPermisosDocumentos ?? []
    });
    this.cdr.detectChanges();
  }

  guardarPropiedades(): void {
    if (!this.nodoSeleccionado || this.propForm.invalid) return;
    
    // Convert boolean toggles back to string list
    const fVals = this.propForm.value;
    const formatos: string[] = [];
    if (fVals.permitePdf) formatos.push('PDF');
    if (fVals.permiteWord) formatos.push('WORD');
    if (fVals.permiteExcel) formatos.push('EXCEL');
    if (fVals.permiteImagenes) formatos.push('IMG');
    if (fVals.permiteAudio) formatos.push('AUDIO');
    if (fVals.permiteVideo) formatos.push('VIDEO');

    const datosFormato = { ...fVals, formatosPermitidos: formatos };
    // Remove temporary boolean fields so they don't pollute the model
    delete datosFormato.permitePdf;
    delete datosFormato.permiteWord;
    delete datosFormato.permiteExcel;
    delete datosFormato.permiteImagenes;
    delete datosFormato.permiteAudio;
    delete datosFormato.permiteVideo;

    const datos: NodoSeleccionado = { ...this.nodoSeleccionado, ...datosFormato };
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

  toggleMicrofonoIA(): void {
    if (!this.recognition) {
      this.snackBar.open('El reconocimiento de voz no está soportado en este navegador.', 'OK', { duration: 3000 });
      return;
    }

    if (this.escuchandoIA) {
      this.recognition.stop();
      this.escuchandoIA = false;
      this.cdr.detectChanges();
    } else {
      this.aiPrompt = '';
      this.escuchandoIA = true;
      try {
        this.recognition.start();
        this.snackBar.open('🎙️ Escuchando... habla ahora', '', { duration: 2000 });
        this.cdr.detectChanges();
      } catch (e) {
        console.error(e);
        this.escuchandoIA = false;
        this.cdr.detectChanges();
      }
    }
  }

  generarFlujoIA(): void {
    if (!this.aiPrompt || !this.aiPrompt.trim()) {
      this.snackBar.open('Por favor ingresa o dicta una instrucción primero.', 'OK', { duration: 3000 });
      return;
    }

    // Extraer datos actuales del modeler
    const { nodos, conexiones } = this.modelerRef ? this.modelerRef.extractData() : { nodos: [], conexiones: [] };

    // Mapear nodos del frontend (fechaLimite) a tiempoLimiteHoras para el backend
    const mappedNodosParaBackend = nodos.map((n: any) => {
      let horas: number | null = null;
      if (n.fechaLimite) {
        const diffMs = new Date(n.fechaLimite).getTime() - new Date().getTime();
        if (diffMs > 0) {
          horas = Math.round(diffMs / (1000 * 60 * 60));
        }
      }
      return {
        id: n.id,
        nombre: n.nombre,
        tipo: n.tipo,
        departamentoId: n.departamentoId || null,
        tiempoLimiteHoras: horas,
        orden: n.orden
      };
    });

    const payload = {
      prompt: this.aiPrompt,
      nodos: mappedNodosParaBackend,
      conexiones: conexiones,
      nombre_actual: this.form.get('nombre')?.value || '',
      tipo_solicitud_actual: this.form.get('tipoSolicitud')?.value || ''
    };

    this.cargandoIA = true;
    this.cdr.detectChanges();
    this.snackBar.open('🤖 Procesando cambios con Gemini...', '', { duration: 2500 });

    this.http.post<any>(environment.iaUrl + '/workflow/generate', payload)
      .subscribe({
        next: (res) => {
          this.cargandoIA = false;
          this.cdr.detectChanges();
          
          if (!res || !res.nodos || res.nodos.length === 0) {
            this.snackBar.open('La IA no pudo estructurar un flujo válido. Intenta con otra frase.', 'OK', { duration: 4000 });
            return;
          }

          // Rellenar formulario principal
          this.form.patchValue({
            nombre: res.nombre_flujo || 'Flujo con IA',
            tipoSolicitud: res.tipo_solicitud || 'SOLICITUD_IA'
          });

          // Mapear tiempoLimiteHoras a fechaLimite
          const mappedNodos = res.nodos.map((n: any) => {
            let fechaLim: string | undefined = undefined;
            if (n.tiempoLimiteHoras) {
              const d = new Date();
              d.setHours(d.getHours() + n.tiempoLimiteHoras);
              fechaLim = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0') + 'T' +
                String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0');
            }
            return {
              id: n.id,
              nombre: n.nombre,
              tipo: n.tipo,
              departamentoId: n.departamentoId,
              fechaLimite: fechaLim,
              orden: n.orden
            };
          });

          // Generar XML desde los nodos y conexiones
          const xml = this.generarXmlDesdeNodos({
            nodos: mappedNodos,
            conexiones: res.conexiones,
            templateId: this.templateId || 'new'
          });

          // Reiniciar el modeler para renderizar
          this.xmlParaCargar = xml;
          this.nodosParaCargar = mappedNodos;
          this.modelerListo = false;
          this.cdr.detectChanges();

          setTimeout(() => {
            this.modelerListo = true;
            this.cdr.detectChanges();
            this.snackBar.open('✨ ¡Diagrama actualizado con éxito!', 'OK', { duration: 3000 });
          }, 50);
        },
        error: (err) => {
          this.cargandoIA = false;
          this.cdr.detectChanges();
          console.error(err);
          this.snackBar.open('Error al conectar con el servicio de IA. Verifica que esté activo en el puerto 8000.', 'OK', { duration: 4000 });
        }
      });
  }

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
    
    const posMap = new Map<string, { x: number; y: number; w: number; h: number }>();
    sorted.forEach((n, i) => {
      const w = (n.tipo==='INICIO'||n.tipo==='FIN')?36:(n.tipo==='DECISION'||n.tipo==='PARALELO')?50:120;
      const h = (n.tipo==='INICIO'||n.tipo==='FIN')?36:(n.tipo==='DECISION'||n.tipo==='PARALELO')?50:80;
      posMap.set(n.id, { x: SX + i * STEP, y: CY - h / 2, w, h });
    });

    const shapes = sorted.map(n => {
      const p = posMap.get(n.id)!;
      return `<bpmndi:BPMNShape id="${n.id}_di" bpmnElement="${n.id}"><dc:Bounds x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/></bpmndi:BPMNShape>`;
    }).join('\n      ');

    const edges = t.conexiones.map(e => {
      const src = posMap.get(e.nodoOrigenId);
      const tgt = posMap.get(e.nodoDestinoId);
      const sx = src ? src.x + src.w     : 100;
      const sy = src ? src.y + src.h / 2 : 100;
      const tx = tgt ? tgt.x             : 200;
      const ty = tgt ? tgt.y + tgt.h / 2 : 100;
      return `<bpmndi:BPMNEdge id="${e.id}_di" bpmnElement="${e.id}">
          <di:waypoint x="${sx}" y="${sy}"/>
          <di:waypoint x="${tx}" y="${ty}"/>
        </bpmndi:BPMNEdge>`;
    }).join('\n      ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://workflow">
  <process id="proc_${t.id}" isExecutable="false">
    ${t.nodos.map(nodoBpmn).join('\n    ')}
    ${t.conexiones.map(edgeBpmn).join('\n    ')}
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_${t.id}">
    <bpmndi:BPMNPlane id="BPMNPlane_${t.id}" bpmnElement="proc_${t.id}">
      ${shapes}
      ${edges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;
  }
}
