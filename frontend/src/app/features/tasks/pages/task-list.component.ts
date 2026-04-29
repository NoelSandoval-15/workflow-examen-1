import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TaskService, Task } from '../services/task.service';
import { WorkflowInstanceService } from '../../workflows/services/workflow-instance.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatDividerModule
  ],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss'
})
export class TaskListComponent implements OnInit {
  tareas: Task[] = [];
  loading = true;
  procesandoId: string | null = null;
  expandedId: string | null = null;
  observacionForm: FormGroup;

  constructor(
    private taskService: TaskService,
    private instanceService: WorkflowInstanceService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.observacionForm = this.fb.group({ observacion: [''] });
  }

  ngOnInit(): void {
    this.cargarTareas();
  }

  cargarTareas(): void {
    this.loading = true;
    this.taskService.misTareas().subscribe({
      next: data => {
        // Mostrar primero las pendientes
        this.tareas = data.sort((a, b) => {
          const orden: Record<string, number> = { PENDIENTE: 0, EN_PROGRESO: 1, COMPLETADO: 2, CANCELADO: 3 };
          return (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9);
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
    this.observacionForm.reset();
  }

  verTramite(tarea: Task): void {
    this.router.navigate(['/tramites', tarea.procesoInstanciaId]);
  }

  /** Avanza el trámite al siguiente nodo desde la tarea del funcionario */
  avanzar(tarea: Task): void {
    this.procesandoId = tarea.id;
    const observacion = this.observacionForm.get('observacion')?.value ?? '';

    this.instanceService.avanzar(tarea.procesoInstanciaId, { observacion }).subscribe({
      next: () => {
        // Completar la tarea local
        this.taskService.completar(tarea.id, observacion).subscribe({
          next: actualizada => {
            const idx = this.tareas.findIndex(t => t.id === tarea.id);
            if (idx !== -1) this.tareas[idx] = actualizada;
            this.procesandoId = null;
            this.expandedId = null;
            this.observacionForm.reset();
            this.cdr.detectChanges();
            // Recargar para ver si hay nueva tarea asignada
            setTimeout(() => this.cargarTareas(), 800);
          },
          error: () => { this.procesandoId = null; this.cdr.detectChanges(); }
        });
      },
      error: () => { this.procesandoId = null; this.cdr.detectChanges(); }
    });
  }

  get pendientes(): Task[] { return this.tareas.filter(t => t.estado === 'PENDIENTE'); }
  get completadas(): Task[] { return this.tareas.filter(t => t.estado === 'COMPLETADO'); }

  getEstadoColor(estado: string): 'primary' | 'accent' | 'warn' | '' {
    const map: Record<string, 'primary' | 'accent' | 'warn' | ''> = {
      PENDIENTE: 'primary', EN_PROGRESO: 'primary', COMPLETADO: 'accent', RECHAZADO: 'warn'
    };
    return map[estado] ?? '';
  }

  getEstadoIcono(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'radio_button_unchecked', EN_PROGRESO: 'pending',
      COMPLETADO: 'check_circle', RECHAZADO: 'cancel'
    };
    return map[estado] ?? 'help';
  }
}
