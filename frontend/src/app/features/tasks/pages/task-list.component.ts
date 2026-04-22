import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { TaskService, Task } from '../services/task.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatDialogModule
  ],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss'
})
export class TaskListComponent implements OnInit {
  tareas: Task[] = [];
  loading = true;
  completandoId: string | null = null;
  expandedId: string | null = null;
  observacionForm: FormGroup;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.observacionForm = this.fb.group({ observacion: [''] });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) { this.loading = false; return; }
    this.taskService.listarPorUsuario(user.username).subscribe({
      next: data => { this.tareas = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  completar(tarea: Task): void {
    const obs = this.observacionForm.get('observacion')?.value ?? '';
    this.completandoId = tarea.id;
    this.taskService.completar(tarea.id, obs).subscribe({
      next: actualizada => {
        const idx = this.tareas.findIndex(t => t.id === tarea.id);
        if (idx !== -1) this.tareas[idx] = actualizada;
        this.completandoId = null;
        this.expandedId = null;
        this.observacionForm.reset();
      },
      error: () => { this.completandoId = null; }
    });
  }

  getEstadoColor(estado: string): string {
    const map: Record<string, string> = {
      'PENDIENTE': '', 'EN_PROGRESO': 'primary',
      'COMPLETADO': 'accent', 'RECHAZADO': 'warn'
    };
    return map[estado] ?? '';
  }
}
