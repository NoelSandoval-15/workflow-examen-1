package com.examensw1.backend.modules.workflow.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WorkflowEdgeDTO {
    private String id;
    private String nodoOrigenId;
    private String nodoDestinoId;
    private String condicion;
    private String etiqueta;
}
