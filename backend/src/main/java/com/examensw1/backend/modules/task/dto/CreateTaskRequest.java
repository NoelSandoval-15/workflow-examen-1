package com.examensw1.backend.modules.task.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CreateTaskRequest {

    @NotBlank(message = "El procesoInstanciaId es obligatorio")
    private String procesoInstanciaId;

    @NotBlank(message = "El nodoId es obligatorio")
    private String nodoId;

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    private String tipo = "MANUAL";
    private String departamentoAsignadoId;
    private String usuarioAsignadoId;
    private boolean requiereEvidencia;
    private LocalDateTime fechaLimite;
}
