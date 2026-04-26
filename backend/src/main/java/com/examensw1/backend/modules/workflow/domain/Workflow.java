package com.examensw1.backend.modules.workflow.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Document(collection = "proceso_templates")
public class Workflow {

    @Id
    private String id;

    private String nombre;
    private String tipoSolicitud;
    private int version = 1;
    private String estado = "BORRADOR";
    private String formularioId;
    private String createdBy;

    private List<WorkflowNode> nodos = new ArrayList<>();
    private List<WorkflowEdge> conexiones = new ArrayList<>();

    /** BPMN 2.0 XML generado por bpmn.js y guardado por el diseñador */
    private String bpmnXml;

    /** ID del deployment en Camunda (se asigna al activar el template) */
    private String camundaDeploymentId;

    /** Process definition key en Camunda = "proc_" + id */
    private String camundaProcessDefinitionKey;

    // Colaboración en tiempo real ──────────────────────────────
    private Boolean collaborationEnabled = false;
    private String  collaborationToken;
    private Long    collaborationVersion = 0L;
    private LocalDateTime collaborationUpdatedAt;
    private LocalDateTime collaborationRevokedAt;
    // ─────────────────────────────────────────────────────────────

    @CreatedDate
    private LocalDateTime createdAt;
}
