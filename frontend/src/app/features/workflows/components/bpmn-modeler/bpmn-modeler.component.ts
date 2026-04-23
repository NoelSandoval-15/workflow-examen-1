import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef, Output, EventEmitter, NgZone } from '@angular/core';
import { WorkflowNode, WorkflowEdge } from '../../models/workflow.model';

export interface NodoSeleccionado {
  id: string;
  nombre: string;
  tipo: string;
  departamentoId?: string;
  rolRequerido?: string;
  tiempoLimiteHoras?: number;
  requiereEvidencia?: boolean;
}

const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             targetNamespace="http://workflow">
  <process id="process_1" isExecutable="false">
    <startEvent id="inicio" name="Inicio"/>
    <endEvent id="fin" name="Fin"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="process_1">
      <bpmndi:BPMNShape id="inicio_di" bpmnElement="inicio">
        <dc:Bounds x="152" y="232" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="fin_di" bpmnElement="fin">
        <dc:Bounds x="602" y="232" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

@Component({
  selector: 'app-bpmn-modeler',
  standalone: true,
  template: `<div #canvas class="modeler-canvas"></div>`,
  styles: [`
    .modeler-canvas {
      width: 100%;
      height: 540px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fafafa;
      overflow: hidden;
    }
    :host ::ng-deep .bjs-powered-by { display: none !important; }
  `]
})
export class BpmnModelerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef;
  @Output() elementoDobleClick = new EventEmitter<NodoSeleccionado>();

  private modeler: any;
  private nodeExtras = new Map<string, Partial<NodoSeleccionado>>();

  constructor(private ngZone: NgZone) {}

  async ngAfterViewInit(): Promise<void> {
    const { default: BpmnModeler } = await import('bpmn-js/lib/Modeler');
    this.modeler = new BpmnModeler({ container: this.canvasRef.nativeElement });
    await this.modeler.importXML(INITIAL_XML);
    this.modeler.get('canvas').zoom('fit-viewport');
    this.registrarEventos();
  }

  private registrarEventos(): void {
    const eventBus = this.modeler.get('eventBus');
    const directEditing = this.modeler.get('directEditing');

    // Prioridad 1500 > default 1000 → corre primero y cancela el editor de etiquetas
    eventBus.on('element.dblclick', 1500, (event: any) => {
      const el = event.element;
      if (el.type === 'bpmn:Process' || el.type === 'label') return;

      event.stopPropagation();
      setTimeout(() => { if (directEditing?.isActive()) directEditing.cancel(); }, 0);

      const extras = this.nodeExtras.get(el.id) ?? {};
      this.ngZone.run(() => {
        this.elementoDobleClick.emit({
          id: el.id,
          nombre: el.businessObject?.name || el.id,
          tipo: el.type,
          ...extras
        });
      });
    });
  }

  actualizarNodo(id: string, datos: NodoSeleccionado): void {
    const registry = this.modeler?.get('elementRegistry');
    const modeling = this.modeler?.get('modeling');
    const element = registry?.get(id);

    if (element && datos.nombre !== undefined) {
      modeling?.updateProperties(element, { name: datos.nombre });
    }

    const { id: _i, nombre: _n, tipo: _t, ...extras } = datos as any;
    this.nodeExtras.set(id, { ...(this.nodeExtras.get(id) ?? {}), ...extras });
  }

  /** Exporta el BPMN 2.0 XML completo para enviarlo al backend y desplegarlo en Camunda */
  async exportXml(): Promise<string> {
    const { xml } = await this.modeler.saveXML({ format: true });
    return xml;
  }

  extractData(): { nodos: WorkflowNode[]; conexiones: WorkflowEdge[] } {
    const registry = this.modeler.get('elementRegistry');
    const nodos: WorkflowNode[] = [];
    const conexiones: WorkflowEdge[] = [];
    let orden = 0;

    registry.forEach((el: any) => {
      const { type, id, businessObject: bo } = el;
      const nombre = bo.name || id;
      // Excluimos tipo e id del extras para no pisar los valores que asignamos explícitamente
      const { tipo: _t, id: _i, nombre: _n, ...extras } = (this.nodeExtras.get(id) ?? {}) as any;

      if (type === 'bpmn:StartEvent') {
        nodos.push({ id, nombre, tipo: 'INICIO', orden: orden++, ...extras });
      } else if (type === 'bpmn:EndEvent') {
        nodos.push({ id, nombre, tipo: 'FIN', orden: orden++, ...extras });
      } else if (type === 'bpmn:ExclusiveGateway') {
        nodos.push({ id, nombre, tipo: 'DECISION', orden: orden++, ...extras });
      } else if (type === 'bpmn:ParallelGateway') {
        nodos.push({ id, nombre, tipo: 'PARALELO', orden: orden++, ...extras });
      } else if (['bpmn:UserTask', 'bpmn:Task', 'bpmn:ServiceTask', 'bpmn:ManualTask'].includes(type)) {
        nodos.push({ id, nombre, tipo: 'TAREA', orden: orden++, ...extras });
      } else if (type === 'bpmn:SequenceFlow') {
        const src = bo.sourceRef?.id;
        const tgt = bo.targetRef?.id;
        if (src && tgt) {
          conexiones.push({ id, nodoOrigenId: src, nodoDestinoId: tgt, etiqueta: bo.name || undefined });
        }
      }
    });

    return { nodos, conexiones };
  }

  ngOnDestroy(): void {
    this.modeler?.destroy();
  }
}
