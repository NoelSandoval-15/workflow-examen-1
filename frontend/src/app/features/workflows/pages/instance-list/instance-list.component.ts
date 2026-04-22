import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkflowInstanceService } from '../../services/workflow-instance.service';
import { ProcesoInstancia } from '../../models/workflow.model';

@Component({
  selector: 'app-instance-list',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule
  ],
  templateUrl: './instance-list.component.html',
  styleUrl: './instance-list.component.scss'
})
export class InstanceListComponent implements OnInit {
  instancias: ProcesoInstancia[] = [];
  loading = true;
  displayedColumns = ['codigo', 'nodoActual', 'estadoActual', 'prioridad', 'createdAt', 'acciones'];

  constructor(
    private instanceService: WorkflowInstanceService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.instanceService.listar().subscribe({
      next: data => { this.instancias = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  verDetalle(id: string): void {
    this.router.navigate(['/tramites', id]);
  }

  getEstadoColor(estado: string): string {
    const map: Record<string, string> = {
      'EN_PROCESO': 'primary',
      'COMPLETADO': 'accent',
      'RECHAZADO': 'warn',
      'CANCELADO': 'warn',
      'EN_ESPERA': ''
    };
    return map[estado] ?? '';
  }
}
