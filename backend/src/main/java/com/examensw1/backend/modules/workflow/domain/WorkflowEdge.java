package com.examensw1.backend.modules.workflow.domain;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WorkflowEdge {
    private String id;
    private String nodoOrigenId;
    private String nodoDestinoId;
    private String condicion;
    private String etiqueta;
}
