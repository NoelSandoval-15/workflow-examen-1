import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { WorkflowNode, WorkflowEdge } from '../../models/workflow.model';

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
      height: 580px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      overflow: hidden;
    }
    :host ::ng-deep .bjs-powered-by { display: none !important; }
  `]
})
export class BpmnModelerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef;
  private modeler: any;

  async ngAfterViewInit(): Promise<void> {
    const { default: BpmnModeler } = await import('bpmn-js/lib/Modeler');
    this.modeler = new BpmnModeler({ container: this.canvasRef.nativeElement });
    await this.modeler.importXML(INITIAL_XML);
    this.modeler.get('canvas').zoom('fit-viewport');
  }

  extractData(): { nodos: WorkflowNode[]; conexiones: WorkflowEdge[] } {
    const registry = this.modeler.get('elementRegistry');
    const nodos: WorkflowNode[] = [];
    const conexiones: WorkflowEdge[] = [];
    let orden = 0;

    registry.forEach((el: any) => {
      const { type, id, businessObject: bo } = el;
      const nombre = bo.name || id;

      if (type === 'bpmn:StartEvent') {
        nodos.push({ id, nombre, tipo: 'INICIO', orden: orden++ });
      } else if (type === 'bpmn:EndEvent') {
        nodos.push({ id, nombre, tipo: 'FIN', orden: orden++ });
      } else if (type === 'bpmn:ExclusiveGateway') {
        nodos.push({ id, nombre, tipo: 'DECISION', orden: orden++ });
      } else if (type === 'bpmn:ParallelGateway') {
        nodos.push({ id, nombre, tipo: 'PARALELO', orden: orden++ });
      } else if (['bpmn:UserTask', 'bpmn:Task', 'bpmn:ServiceTask', 'bpmn:ManualTask'].includes(type)) {
        nodos.push({ id, nombre, tipo: 'TAREA', orden: orden++ });
      } else if (type === 'bpmn:SequenceFlow') {
        const src = bo.sourceRef?.id;
        const tgt = bo.targetRef?.id;
        if (src && tgt) {
          conexiones.push({
            id,
            nodoOrigenId: src,
            nodoDestinoId: tgt,
            etiqueta: bo.name || undefined
          });
        }
      }
    });

    return { nodos, conexiones };
  }

  ngOnDestroy(): void {
    this.modeler?.destroy();
  }
}
