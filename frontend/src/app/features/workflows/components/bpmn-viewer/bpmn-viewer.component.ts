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

  private computeLayout(template: WorkflowTemplate): Map<string, { x: number; y: number; w: number; h: number }> {
    const dim = (n: WorkflowNode) => {
      if (n.tipo === 'INICIO' || n.tipo === 'FIN') return { w: 36, h: 36 };
      if (n.tipo === 'DECISION' || n.tipo === 'PARALELO') return { w: 50, h: 50 };
      return { w: 120, h: 80 };
    };

    // Build adjacency list (outgoing edges)
    const adj = new Map<string, string[]>();
    for (const n of template.nodos) adj.set(n.id, []);
    for (const e of template.conexiones) {
      const list = adj.get(e.nodoOrigenId);
      if (list) list.push(e.nodoDestinoId);
    }

    // BFS from INICIO node to assign column levels
    const startNode = template.nodos.find(n => n.tipo === 'INICIO') ?? template.nodos[0];
    const level = new Map<string, number>();
    const queue: string[] = [startNode.id];
    level.set(startNode.id, 0);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLevel = level.get(curr)!;
      for (const next of (adj.get(curr) ?? [])) {
        if (!level.has(next)) {
          level.set(next, currLevel + 1);
          queue.push(next);
        }
      }
    }

    // Assign remaining nodes (unreachable from start) to end columns
    let maxLevel = 0;
    for (const v of level.values()) if (v > maxLevel) maxLevel = v;
    for (const n of template.nodos) {
      if (!level.has(n.id)) level.set(n.id, ++maxLevel);
    }

    // Group nodes by level to calculate Y positions
    const byLevel = new Map<number, string[]>();
    for (const [id, lv] of level.entries()) {
      if (!byLevel.has(lv)) byLevel.set(lv, []);
      byLevel.get(lv)!.push(id);
    }

    const nodeMap = new Map<string, WorkflowNode>();
    for (const n of template.nodos) nodeMap.set(n.id, n);

    const STEP_X = 190;
    const STEP_Y = 120;
    const START_X = 60;
    const START_Y = 60;

    const posMap = new Map<string, { x: number; y: number; w: number; h: number }>();

    for (const [lv, ids] of byLevel.entries()) {
      const totalHeight = ids.length * STEP_Y;
      ids.forEach((id, rowIdx) => {
        const node = nodeMap.get(id)!;
        const { w, h } = dim(node);
        const centerY = START_Y + totalHeight / 2 - STEP_Y / 2 + rowIdx * STEP_Y;
        posMap.set(id, {
          x: START_X + lv * STEP_X,
          y: centerY - h / 2,
          w,
          h
        });
      });
    }

    return posMap;
  }

  private buildBpmnXml(template: WorkflowTemplate): string {
    const posMap = this.computeLayout(template);

    const shapes = template.nodos.map(n => {
      const name = n.nombre.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      switch (n.tipo) {
        case 'INICIO':   return `<startEvent id="${n.id}" name="${name}"/>`;
        case 'FIN':      return `<endEvent id="${n.id}" name="${name}"/>`;
        case 'DECISION': return `<exclusiveGateway id="${n.id}" name="${name}"/>`;
        case 'PARALELO': return `<parallelGateway id="${n.id}" name="${name}"/>`;
        default:         return `<userTask id="${n.id}" name="${name}"/>`;
      }
    }).join('\n    ');

    const flows = template.conexiones.map(e => {
      const label = e.etiqueta ? ` name="${e.etiqueta.replace(/&/g, '&amp;')}"` : '';
      return `<sequenceFlow id="${e.id}" sourceRef="${e.nodoOrigenId}" targetRef="${e.nodoDestinoId}"${label}/>`;
    }).join('\n    ');

    const diShapes = template.nodos.map(n => {
      const p = posMap.get(n.id) ?? { x: 80, y: 180, w: 120, h: 80 };
      return `<bpmndi:BPMNShape bpmnElement="${n.id}">
          <dc:Bounds x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/>
        </bpmndi:BPMNShape>`;
    }).join('\n      ');

    const diEdges = template.conexiones.map(e => {
      const src = posMap.get(e.nodoOrigenId);
      const tgt = posMap.get(e.nodoDestinoId);
      const sx = src ? src.x + src.w     : 100;
      const sy = src ? src.y + src.h / 2 : 100;
      const tx = tgt ? tgt.x             : 200;
      const ty = tgt ? tgt.y + tgt.h / 2 : 100;
      return `<bpmndi:BPMNEdge bpmnElement="${e.id}">
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

  ngOnDestroy(): void {
    this.viewer?.destroy();
  }
}
