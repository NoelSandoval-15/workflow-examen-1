package com.examensw1.backend.modules.workflow.domain;

import com.examensw1.backend.shared.enums.NodeType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WorkflowNode {
    private String id;
    private String nombre;
    private NodeType tipo;
    private String departamentoId;
    private String rolRequerido;
    private String formularioId;
    private String funcionarioId;    // usuario asignado a este nodo
    private boolean requiereEvidencia;
    private int tiempoLimiteHoras;
    private int orden;
}
