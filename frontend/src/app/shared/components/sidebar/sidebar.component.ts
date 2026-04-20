import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard',        icon: 'dashboard',    route: '/dashboard' },
    { label: 'Trámites',         icon: 'description',  route: '/tramites' },
    { label: 'Flujos de Trabajo',icon: 'account_tree', route: '/flujos' },
    { label: 'Mis Tareas',       icon: 'task_alt',     route: '/tareas' },
    { label: 'Notificaciones',   icon: 'notifications',route: '/notificaciones' },
    { label: 'Usuarios',         icon: 'people',       route: '/admin/usuarios',     adminOnly: true },
    { label: 'Departamentos',    icon: 'business',     route: '/admin/departamentos', adminOnly: true },
    { label: 'Clientes',         icon: 'person_pin',   route: '/admin/clientes',     adminOnly: true },
  ];

  constructor(private authService: AuthService) {}

  get visibleItems(): NavItem[] {
    const user = this.authService.getCurrentUser();
    const isAdmin = user?.rolId === 'admin' || user?.username === 'admin';
    return this.navItems.filter(i => !i.adminOnly || isAdmin);
  }
}
