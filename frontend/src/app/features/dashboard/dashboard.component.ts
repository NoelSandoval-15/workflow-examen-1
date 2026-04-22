import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkflowInstanceService } from '../workflows/services/workflow-instance.service';
import { TaskService } from '../tasks/services/task.service';
import { AuthService } from '../../core/services/auth.service';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  route: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = true;
  stats: StatCard[] = [];
  recentInstancias: any[] = [];

  constructor(
    private instanceService: WorkflowInstanceService,
    private taskService: TaskService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) { this.loading = false; return; }

    forkJoin({
      instancias: this.instanceService.listar().pipe(catchError(() => of([]))),
      tareas: this.taskService.listarPorUsuario(user.username).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ instancias, tareas }) => {
        this.stats = [
          {
            label: 'Trámites Activos',
            value: instancias.filter(i => i.estadoActual === 'EN_PROCESO').length,
            icon: 'pending_actions', color: '#3b82f6', route: '/tramites'
          },
          {
            label: 'Completados',
            value: instancias.filter(i => i.estadoActual === 'COMPLETADO').length,
            icon: 'check_circle', color: '#10b981', route: '/tramites'
          },
          {
            label: 'Rechazados',
            value: instancias.filter(i => i.estadoActual === 'RECHAZADO').length,
            icon: 'cancel', color: '#ef4444', route: '/tramites'
          },
          {
            label: 'Mis Tareas Pendientes',
            value: tareas.filter(t => t.estado === 'PENDIENTE').length,
            icon: 'task_alt', color: '#8b5cf6', route: '/tareas'
          }
        ];
        this.recentInstancias = instancias
          .sort((a, b) => new Date(b.createdAt ?? '').getTime() - new Date(a.createdAt ?? '').getTime())
          .slice(0, 5);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }
}
