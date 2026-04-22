import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'tramites',
        loadComponent: () => import('./features/workflows/pages/instance-list/instance-list.component').then(m => m.InstanceListComponent)
      },
      {
        path: 'tramites/:id',
        loadComponent: () => import('./features/workflows/pages/instance-detail/instance-detail.component').then(m => m.InstanceDetailComponent)
      },
      {
        path: 'flujos',
        loadComponent: () => import('./features/workflows/pages/template-list/template-list.component').then(m => m.TemplateListComponent)
      },
      {
        path: 'flujos/nuevo',
        loadComponent: () => import('./features/workflows/pages/workflow-designer/workflow-designer.component').then(m => m.WorkflowDesignerComponent)
      },
      {
        path: 'tareas',
        loadComponent: () => import('./features/tasks/pages/task-list.component').then(m => m.TaskListComponent)
      },
      {
        path: 'notificaciones',
        loadComponent: () => import('./features/notifications/components/notification-list/notification-list.component').then(m => m.NotificationListComponent)
      },
      {
        path: 'admin/usuarios',
        loadComponent: () => import('./features/admin/users/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'admin/departamentos',
        loadComponent: () => import('./features/admin/departments/department-list.component').then(m => m.DepartmentListComponent)
      },
      {
        path: 'admin/clientes',
        loadComponent: () => import('./features/admin/clients/client-list.component').then(m => m.ClientListComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
