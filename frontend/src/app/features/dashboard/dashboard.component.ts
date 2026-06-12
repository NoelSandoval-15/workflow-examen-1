import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import { WorkflowInstanceService } from '../workflows/services/workflow-instance.service';
import { AuthService } from '../../core/services/auth.service';
import { WorkflowTemplateService } from '../workflows/services/workflow-template.service';
import { AdminService } from '../admin/services/admin.service';

import { Chart } from 'chart.js/auto';

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
  imports: [
    CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, FormsModule, HttpClientModule, MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading = true;
  stats: StatCard[] = [];
  recentInstancias: any[] = [];

  // Variables para Análisis de Cuellos de Botella (IA)
  templates: any[] = [];
  selectedTemplateId: string = '';
  selectedEngine: string = 'cloud';
  loadingIA = false;
  iaReport: any = null;
  errorIA: string | null = null;

  // Instancias de Gráficos de Chart.js
  private chartBarras: Chart | null = null;
  private chartDonaEficiencia: Chart | null = null;
  private chartDonaDeptos: Chart | null = null;
  private chartSeveridad: Chart | null = null;

  constructor(
    private instanceService: WorkflowInstanceService,
    private adminService: AdminService,
    private templateService: WorkflowTemplateService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) { this.loading = false; return; }

    // Cargar estadísticas generales y plantillas
    forkJoin({
      instancias: this.instanceService.listar().pipe(catchError(() => of([]))),
      departamentos: this.adminService.listarDepartamentos().pipe(catchError(() => of([]))),
      usuarios: this.adminService.listarUsuarios().pipe(catchError(() => of([]))),
      plantillas: this.templateService.listar().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ instancias, departamentos, usuarios, plantillas }) => {
        this.templates = plantillas;
        
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
            label: 'Departamentos',
            value: departamentos.length,
            icon: 'domain', color: '#8b5cf6', route: '/admin/departamentos'
          },
          {
            label: 'Funcionarios',
            value: usuarios.length,
            icon: 'people', color: '#f59e0b', route: '/admin/usuarios'
          }
        ];
        
        this.recentInstancias = instancias
          .sort((a, b) => new Date(b.createdAt ?? '').getTime() - new Date(a.createdAt ?? '').getTime())
          .slice(0, 5);
        
        this.loading = false;
        this.cdr.detectChanges();

        // Verificar si viene con un templateId pre-seleccionado en los Query Params
        this.route.queryParams.subscribe(params => {
          if (params['templateId']) {
            this.selectedTemplateId = params['templateId'];
          }
          // Se removió el auto-fetch de la IA para que el usuario presione el botón explícitamente
        });
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  ngOnDestroy(): void {
    this.destruirGraficos();
  }

  onTemplateChange(): void {
    // Al cambiar de plantilla, limpiamos el reporte y gráficos previos
    this.iaReport = null;
    this.errorIA = null;
    this.destruirGraficos();
  }

  consultarAnalisisIA(): void {
    this.loadingIA = true;
    this.errorIA = null;
    this.cdr.detectChanges();

    let url = environment.iaUrl + '/cuellos-botella';
    const params: string[] = [];
    if (this.selectedTemplateId) {
      params.push(`templateId=${this.selectedTemplateId}`);
    }
    if (this.selectedEngine) {
      params.push(`metodo=${this.selectedEngine}`);
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.iaReport = res;
        this.loadingIA = false;
        this.cdr.detectChanges();
        this.actualizarGraficos();
      },
      error: (err) => {
        console.error('Error al consultar IA de cuellos de botella:', err);
        this.errorIA = 'No se pudo cargar el análisis de la IA. Asegúrate de que el microservicio en el puerto 8000 esté corriendo y configurado correctamente.';
        this.loadingIA = false;
        this.iaReport = null;
        this.destruirGraficos();
        this.cdr.detectChanges();
      }
    });
  }

  private destruirGraficos(): void {
    if (this.chartBarras) { this.chartBarras.destroy(); this.chartBarras = null; }
    if (this.chartDonaEficiencia) { this.chartDonaEficiencia.destroy(); this.chartDonaEficiencia = null; }
    if (this.chartDonaDeptos) { this.chartDonaDeptos.destroy(); this.chartDonaDeptos = null; }
    if (this.chartSeveridad) { this.chartSeveridad.destroy(); this.chartSeveridad = null; }
  }

  private actualizarGraficos(): void {
    this.destruirGraficos();
    if (!this.iaReport || !this.iaReport.metricas || !this.iaReport.metricas.nodos) return;

    const nodos = this.iaReport.metricas.nodos;
    const analisis = this.iaReport.analisis_ia || {};
    
    // 1. Gráfico de Barras: Comparación de Tiempos (Promedio vs Límite)
    const ctxBarras = document.getElementById('chartBarras') as HTMLCanvasElement;
    if (ctxBarras) {
      this.chartBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
          labels: nodos.map((n: any) => n.nombre),
          datasets: [
            {
              label: 'Tiempo Real Promedio (hrs)',
              data: nodos.map((n: any) => n.tiempo_promedio_horas),
              backgroundColor: 'rgba(59, 130, 246, 0.75)', // Azul
              borderColor: '#3b82f6',
              borderWidth: 1.5
            },
            {
              label: 'Tiempo Límite Configurado (hrs)',
              data: nodos.map((n: any) => n.tiempo_limite_horas),
              backgroundColor: 'rgba(156, 163, 175, 0.4)', // Gris
              borderColor: '#9ca3af',
              borderWidth: 1.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#ffffff' } } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#ffffff' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#ffffff' } }
          }
        }
      });
    }

    // 2. Dona 1: Eficiencia de Tareas (Pendientes A tiempo vs Vencidas)
    let totalPendientes = 0;
    let totalAtrasadas = 0;
    nodos.forEach((n: any) => {
      totalPendientes += n.pendientes;
      totalAtrasadas += n.atrasadas;
    });
    
    const aTiempo = Math.max(0, totalPendientes - totalAtrasadas);

    const ctxEficiencia = document.getElementById('chartDonaEficiencia') as HTMLCanvasElement;
    if (ctxEficiencia) {
      this.chartDonaEficiencia = new Chart(ctxEficiencia, {
        type: 'doughnut',
        data: {
          labels: ['A tiempo', 'Atrasadas'],
          datasets: [{
            data: [aTiempo === 0 && totalAtrasadas === 0 ? 1 : aTiempo, totalAtrasadas],
            backgroundColor: ['#10b981', '#ef4444'], // Verde vs Rojo
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#ffffff', boxWidth: 12 } }
          }
        }
      });
    }

    // 3. Dona 2: Retrasos por Departamento
    const deptoAtrasos: { [key: string]: number } = {};
    nodos.forEach((n: any) => {
      if (n.atrasadas > 0) {
        deptoAtrasos[n.departamento] = (deptoAtrasos[n.departamento] || 0) + n.atrasadas;
      }
    });

    const deptosLabels = Object.keys(deptoAtrasos);
    const deptosData = Object.values(deptoAtrasos);

    const ctxDeptos = document.getElementById('chartDonaDeptos') as HTMLCanvasElement;
    if (ctxDeptos) {
      this.chartDonaDeptos = new Chart(ctxDeptos, {
        type: 'doughnut',
        data: {
          labels: deptosLabels.length ? deptosLabels : ['Sin retrasos'],
          datasets: [{
            data: deptosData.length ? deptosData : [1],
            backgroundColor: deptosData.length 
              ? ['#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'] 
              : ['#10b981'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#ffffff', boxWidth: 12 } }
          }
        }
      });
    }

    // 4. Dona 3: Indicador de Alerta de Severidad (Velocímetro)
    const alerta = (analisis.nivel_alerta_global || 'SALUDABLE').toUpperCase();
    let colorSeveridad = '#10b981'; // Verde
    let valorSeveridad = 1;
    let labelSeveridad = 'Saludable';

    if (alerta === 'CRITICO' || alerta === 'CRÍTICO' || alerta === 'ALTA') {
      colorSeveridad = '#ef4444'; // Rojo
      valorSeveridad = 3;
      labelSeveridad = 'Crítico';
    } else if (alerta === 'ADVERTENCIA' || alerta === 'MEDIA') {
      colorSeveridad = '#f59e0b'; // Amarillo/Naranja
      valorSeveridad = 2;
      labelSeveridad = 'Advertencia';
    }

    const ctxSeveridad = document.getElementById('chartSeveridad') as HTMLCanvasElement;
    if (ctxSeveridad) {
      this.chartSeveridad = new Chart(ctxSeveridad, {
        type: 'doughnut',
        data: {
          labels: [labelSeveridad, ''],
          datasets: [{
            data: [valorSeveridad, 3 - valorSeveridad],
            backgroundColor: [colorSeveridad, 'rgba(255,255,255,0.05)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          circumference: 180,
          rotation: 270,
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  }

  getAlertaColor(alerta: string): string {
    const a = (alerta || '').toUpperCase();
    if (a === 'CRITICO' || a === 'CRÍTICO' || a === 'ALTA') return '#ef4444';
    if (a === 'ADVERTENCIA' || a === 'MEDIA') return '#f59e0b';
    return '#10b981';
  }

  getSeveridadBadgeClass(severidad: string): string {
    const s = (severidad || '').toUpperCase();
    if (s === 'ALTA' || s === 'CRITICO') return 'badge-danger';
    if (s === 'MEDIA' || s === 'ADVERTENCIA') return 'badge-warning';
    return 'badge-success';
  }
}

