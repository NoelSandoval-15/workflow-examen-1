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
  bpmnXml?: string;
  camundaProcessDefinitionKey?: string;
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
  /** ID de tarea activa en Camunda — usar para completar desde el detalle del trámite */
  camundaTaskId?: string;
  /** ID de instancia de proceso en Camunda */
  camundaProcessInstanceId?: string;
}

export interface CreateWorkflowRequest {
  nombre: string;
  tipoSolicitud: string;
  formularioId?: string;
  nodos: WorkflowNode[];
  conexiones: WorkflowEdge[];
  /** BPMN 2.0 XML exportado por bpmn.js — el motor Camunda lo usará para ejecutar */
  bpmnXml?: string;
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
