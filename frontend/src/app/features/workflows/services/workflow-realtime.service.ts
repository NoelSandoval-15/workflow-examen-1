import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CollaborationEvent {
  type: string;
  workflowId: string;
  clientId: string;
  username: string;
  version: number;
  bpmnXml?: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class WorkflowRealtimeService implements OnDestroy {

  /** Emite eventos recibidos de otros colaboradores */
  remoteEvent$ = new Subject<CollaborationEvent>();

  private client?: Client;
  private subscription?: StompSubscription;
  private connected = false;
  private currentWorkflowId?: string;

  constructor(private ngZone: NgZone) {}

  /** Conecta al canal STOMP de la sala del workflow */
  connect(workflowId: string): void {
    if (this.connected && this.currentWorkflowId === workflowId) return;

    // Desconectar sala anterior si existía
    this.disconnect();
    this.currentWorkflowId = workflowId;

    this.ngZone.runOutsideAngular(() => {
      import('sockjs-client').then(({ default: SockJS }) => {
        this.client = new Client({
          webSocketFactory: () => new SockJS(environment.wsUrl),
          reconnectDelay: 3000,
          onConnect: () => {
            this.connected = true;

            // Suscribir a la sala colaborativa
            this.subscription = this.client!.subscribe(
              `/topic/workflows/${workflowId}/collaboration`,
              (msg: IMessage) => {
                const event: CollaborationEvent = JSON.parse(msg.body);
                this.ngZone.run(() => this.remoteEvent$.next(event));
              }
            );
          },
          onDisconnect: () => { this.connected = false; }
        });
        this.client.activate();
      });
    });
  }

  /** Envía un cambio BPMN XML a todos los colaboradores de la sala */
  sendBpmnChange(workflowId: string, clientId: string, username: string,
                  version: number, bpmnXml: string): void {
    if (!this.connected || !this.client?.connected) return;
    const event: CollaborationEvent = {
      type: 'BPMN_XML_CHANGED',
      workflowId,
      clientId,
      username,
      version,
      bpmnXml,
      timestamp: new Date().toISOString()
    };
    this.client.publish({
      destination: `/app/workflows/${workflowId}/collaboration/change`,
      body: JSON.stringify(event)
    });
  }

  /** Notifica JOIN o LEAVE a la sala */
  sendPresence(workflowId: string, clientId: string, username: string, type: 'JOIN' | 'LEAVE'): void {
    if (!this.connected || !this.client?.connected) return;
    this.client.publish({
      destination: `/app/workflows/${workflowId}/collaboration/presence`,
      body: JSON.stringify({ type, workflowId, clientId, username })
    });
  }

  disconnect(): void {
    this.subscription?.unsubscribe();
    this.client?.deactivate();
    this.connected = false;
    this.currentWorkflowId = undefined;
  }

  ngOnDestroy(): void { this.disconnect(); }
}
