package com.examensw1.backend.modules.workflow.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** Datos mínimos devueltos al entrar por link colaborativo */
@Data
public class CollaborationSessionDTO {
    private String templateId;
    private String templateNombre;
    private String tipoSolicitud;
    private String bpmnXml;
    private List<WorkflowNodeDTO> nodos;
    private List<WorkflowEdgeDTO> conexiones;
    private Long collaborationVersion;
    private LocalDateTime collaborationUpdatedAt;
}
