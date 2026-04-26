package com.examensw1.backend.modules.workflow.dto;

import com.examensw1.backend.shared.enums.NodeType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WorkflowNodeDTO {
    private String id;

    @NotBlank(message = "El nombre del nodo es obligatorio")
    private String nombre;

    @NotNull(message = "El tipo de nodo es obligatorio")
    private NodeType tipo;

    private String departamentoId;
    private String rolRequerido;
    private String formularioId;
    private String funcionarioId;
    private boolean requiereEvidencia;
    private int tiempoLimiteHoras;
    private int orden;
}
