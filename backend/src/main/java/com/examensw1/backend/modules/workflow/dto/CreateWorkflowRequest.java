package com.examensw1.backend.modules.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class CreateWorkflowRequest {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotBlank(message = "El tipo de solicitud es obligatorio")
    private String tipoSolicitud;

    private String formularioId;
    private List<WorkflowNodeDTO> nodos = new ArrayList<>();
    private List<WorkflowEdgeDTO> conexiones = new ArrayList<>();

    /** BPMN 2.0 XML exportado por bpmn.js desde el diseñador */
    private String bpmnXml;
}
