import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService, Notification } from '../../services/notification.service';
import { WebsocketService } from '../../../../core/services/websocket.service';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './notification-list.component.html',
  styleUrl: './notification-list.component.scss'
})
export class NotificationListComponent implements OnInit {
  notificaciones: Notification[] = [];
  loading = true;

  constructor(
    private notifService: NotificationService,
    private wsService: WebsocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.wsService.notification$.subscribe(nueva => {
      this.notificaciones.unshift(nueva);
      this.cdr.detectChanges();
    });
  }

  cargar(): void {
    this.notifService.listar().subscribe({
      next: data => { this.notificaciones = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  marcarLeida(notif: Notification): void {
    if (notif.leida) return;
    this.notifService.marcarLeida(notif.id).subscribe(actualizada => {
      const idx = this.notificaciones.findIndex(n => n.id === notif.id);
      if (idx !== -1) this.notificaciones[idx] = actualizada;
    });
  }

  marcarTodas(): void {
    this.notifService.marcarTodasLeidas().subscribe(() => {
      this.notificaciones = this.notificaciones.map(n => ({ ...n, leida: true }));
    });
  }

  getIcono(tipo: string): string {
    const map: Record<string, string> = {
      'WORKFLOW_AVANCE': 'arrow_forward',
      'WORKFLOW_RECHAZO': 'cancel',
    };
    return map[tipo] ?? 'notifications';
  }
}
