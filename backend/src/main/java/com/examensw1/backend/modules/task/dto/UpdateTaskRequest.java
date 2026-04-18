package com.examensw1.backend.modules.task.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateTaskRequest {
    private String estado;
    private String observacion;
    private String usuarioAsignadoId;
}
