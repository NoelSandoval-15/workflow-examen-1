package com.examensw1.backend.modules.workflow.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class ProcesoInstanciaDTO {
    private String id;
    private String codigo;
    private String templateId;
    private String clienteId;
    private String estadoActual;
    private String prioridad;
    private WorkflowNodeDTO nodoActual;
    private String responsableActualId;
    private Map<String, Object> datosFormulario;
    private List<HistorialEntryDTO> historialResumen;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime finishedAt;
}
