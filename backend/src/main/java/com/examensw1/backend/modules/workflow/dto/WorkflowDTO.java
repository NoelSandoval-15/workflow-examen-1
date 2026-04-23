package com.examensw1.backend.modules.workflow.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class WorkflowDTO {
    private String id;
    private String nombre;
    private String tipoSolicitud;
    private int version;
    private String estado;
    private String formularioId;
    private String createdBy;
    private List<WorkflowNodeDTO> nodos;
    private List<WorkflowEdgeDTO> conexiones;
    private LocalDateTime createdAt;

    /** BPMN XML guardado por el diseñador */
    private String bpmnXml;

    /** Clave del proceso en Camunda — presente solo si el template fue activado */
    private String camundaProcessDefinitionKey;
}
