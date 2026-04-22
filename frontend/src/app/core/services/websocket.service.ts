import { Injectable, OnDestroy, PLATFORM_ID, Inject, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {

  private client?: Client;
  private connected = false;
  notification$ = new Subject<any>();

  constructor(
    private authService: AuthService,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  connect(): void {
    if (!isPlatformBrowser(this.platformId) || this.connected) return;

    // Corre fuera de Angular Zone para no bloquear el change detection
    this.ngZone.runOutsideAngular(() => {
      import('sockjs-client').then(({ default: SockJS }) => {
        this.client = new Client({
          webSocketFactory: () => new SockJS(environment.wsUrl),
          onConnect: () => {
            this.connected = true;
            const user = this.authService.getCurrentUser();
            if (user) {
              this.client!.subscribe(
                `/user/${user.username}/queue/notificaciones`,
                (msg: IMessage) => {
                  // Vuelve a la zona de Angular solo cuando hay datos para la UI
                  this.ngZone.run(() => this.notification$.next(JSON.parse(msg.body)));
                }
              );
            }
          }
        });
        this.client.activate();
      });
    });
  }

  disconnect(): void {
    if (this.connected) {
      this.client?.deactivate();
      this.connected = false;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
