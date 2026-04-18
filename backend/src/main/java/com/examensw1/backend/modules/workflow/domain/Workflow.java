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

    @CreatedDate
    private LocalDateTime createdAt;
}
