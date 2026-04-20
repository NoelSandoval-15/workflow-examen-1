import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {

  private client: Client;
  private connected = false;
  notification$ = new Subject<any>();

  constructor(private authService: AuthService) {
    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      onConnect: () => {
        this.connected = true;
        const user = this.authService.getCurrentUser();
        if (user) {
          this.client.subscribe(
            `/user/${user.username}/queue/notificaciones`,
            (msg: IMessage) => {
              this.notification$.next(JSON.parse(msg.body));
            }
          );
        }
      }
    });
  }

  connect(): void {
    if (!this.connected) {
      this.client.activate();
    }
  }

  disconnect(): void {
    if (this.connected) {
      this.client.deactivate();
      this.connected = false;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
