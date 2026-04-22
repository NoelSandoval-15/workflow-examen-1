export interface WorkflowNode {
  id: string;
  nombre: string;
  tipo: 'INICIO' | 'TAREA' | 'DECISION' | 'PARALELO' | 'FIN';
  departamentoId?: string;
  rolRequerido?: string;
  formularioId?: string;
  requiereEvidencia?: boolean;
  tiempoLimiteHoras?: number;
  orden?: number;
}

export interface WorkflowEdge {
  id: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
  condicion?: string;
  etiqueta?: string;
}

export interface WorkflowTemplate {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: 'BORRADOR' | 'ACTIVO' | 'INACTIVO';
  nodos: WorkflowNode[];
  conexiones: WorkflowEdge[];
  createdAt?: string;
}

export interface HistorialEntry {
  nodoId: string;
  nodoNombre: string;
  usuarioId: string;
  accion: string;
  observacion?: string;
  fecha: string;
}

export interface ProcesoInstancia {
  id: string;
  codigo: string;
  templateId: string;
  clienteId?: string;
  estadoActual: 'EN_PROCESO' | 'COMPLETADO' | 'RECHAZADO' | 'CANCELADO' | 'EN_ESPERA';
  prioridad?: string;
  nodoActual?: WorkflowNode;
  responsableActualId?: string;
  datosFormulario?: Record<string, any>;
  historialResumen?: HistorialEntry[];
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string;
}

export interface CreateWorkflowRequest {
  nombre: string;
  tipoSolicitud: string;
  formularioId?: string;
  nodos: WorkflowNode[];
  conexiones: WorkflowEdge[];
}

export interface IniciarProcesoRequest {
  templateId: string;
  clienteId?: string;
  prioridad?: string;
  datosFormulario?: Record<string, any>;
}

export interface AvanzarRequest {
  observacion?: string;
  condicion?: string;
}
