import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HistorialEntry } from '../../models/workflow.model';

@Component({
  selector: 'app-history-timeline',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './history-timeline.component.html',
  styleUrl: './history-timeline.component.scss'
})
export class HistoryTimelineComponent {
  @Input() historial: HistorialEntry[] = [];

  getIcono(accion: string): string {
    const map: Record<string, string> = {
      'INICIO':   'play_circle',
      'AVANCE':   'arrow_forward',
      'RECHAZO':  'cancel',
      'FIN':      'check_circle'
    };
    return map[accion] ?? 'circle';
  }

  getColor(accion: string): string {
    const map: Record<string, string> = {
      'INICIO':  '#3b82f6',
      'AVANCE':  '#10b981',
      'RECHAZO': '#ef4444',
      'FIN':     '#8b5cf6'
    };
    return map[accion] ?? '#94a3b8';
  }
}
