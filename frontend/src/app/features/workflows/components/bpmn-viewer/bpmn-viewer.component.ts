import { Component, Input, OnChanges, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import { WorkflowTemplate, WorkflowNode, WorkflowEdge } from '../../models/workflow.model';

@Component({
  selector: 'app-bpmn-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #canvas class="bpmn-canvas"></div>
    @if (!xml) {
      <div class="bpmn-placeholder">
        <span>Sin diagrama disponible</span>
      </div>
    }
  `,
  styles: [`
    .bpmn-canvas { width: 100%; height: 420px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; }
    .bpmn-placeholder { display: flex; align-items: center; justify-content: center; height: 420px; color: #94a3b8; }
  `]
})
export class BpmnViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() template?: WorkflowTemplate;
  @Input() nodoActualId?: string;
  @ViewChild('canvas') canvasRef!: ElementRef;

  private viewer: any;
  xml = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.viewer = new BpmnViewer({ container: this.canvasRef.nativeElement });
    if (this.template) this.renderizar();
  }

  ngOnChanges(): void {
    if (this.viewer && this.template) {
      setTimeout(() => this.renderizar(), 0);
    }
  }

  private renderizar(): void {
    if (!this.template) return;
    this.xml = this.buildBpmnXml(this.template);
    this.cdr.detectChanges();
    this.viewer.importXML(this.xml).then(() => {
      this.viewer.get('canvas').zoom('fit-viewport');
      if (this.nodoActualId) this.resaltarNodo(this.nodoActualId);
    }).catch(() => {});
  }

  private resaltarNodo(nodoId: string): void {
    try {
      const canvas = this.viewer.get('canvas');
      canvas.addMarker(nodoId, 'highlight-current');
    } catch {}
  }

  private buildBpmnXml(template: WorkflowTemplate): string {
    const shapes = template.nodos.map(n => this.nodeToShape(n)).join('\n');
    const flows  = template.conexiones.map(e => this.edgeToFlow(e)).join('\n');
    const diShapes = template.nodos.map((n, i) => this.nodeToDiShape(n, i)).join('\n');
    const diEdges  = template.conexiones.map(e => this.edgeToDiEdge(e, template)).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://workflow">
  <process id="process_${template.id}" isExecutable="false">
    ${shapes}
    ${flows}
  </process>
  <bpmndi:BPMNDiagram>
    <bpmndi:BPMNPlane bpmnElement="process_${template.id}">
      ${diShapes}
      ${diEdges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;
  }

  private nodeToShape(n: WorkflowNode): string {
    const name = n.nombre.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    switch (n.tipo) {
      case 'INICIO':    return `<startEvent id="${n.id}" name="${name}"/>`;
      case 'FIN':       return `<endEvent id="${n.id}" name="${name}"/>`;
      case 'DECISION':  return `<exclusiveGateway id="${n.id}" name="${name}"/>`;
      case 'PARALELO':  return `<parallelGateway id="${n.id}" name="${name}"/>`;
      default:          return `<userTask id="${n.id}" name="${name}"/>`;
    }
  }

  private edgeToFlow(e: WorkflowEdge): string {
    const label = e.etiqueta ? ` name="${e.etiqueta.replace(/&/g,'&amp;')}"` : '';
    return `<sequenceFlow id="${e.id}" sourceRef="${e.nodoOrigenId}" targetRef="${e.nodoDestinoId}"${label}/>`;
  }

  private nodeToDiShape(n: WorkflowNode, idx: number): string {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x = 80 + col * 180;
    const y = 80 + row * 150;
    const isGateway = n.tipo === 'DECISION' || n.tipo === 'PARALELO';
    const isEvent   = n.tipo === 'INICIO' || n.tipo === 'FIN';
    const w = isEvent ? 36 : isGateway ? 50 : 100;
    const h = isEvent ? 36 : isGateway ? 50 : 80;
    return `<bpmndi:BPMNShape bpmnElement="${n.id}">
        <dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}"/>
      </bpmndi:BPMNShape>`;
  }

  private edgeToDiEdge(e: WorkflowEdge, _t: WorkflowTemplate): string {
    return `<bpmndi:BPMNEdge bpmnElement="${e.id}">
        <di:waypoint x="100" y="100"/>
        <di:waypoint x="200" y="100"/>
      </bpmndi:BPMNEdge>`;
  }

  ngOnDestroy(): void {
    this.viewer?.destroy();
  }
}
