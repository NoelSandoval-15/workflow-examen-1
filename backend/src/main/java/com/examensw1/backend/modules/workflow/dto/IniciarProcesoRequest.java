package com.examensw1.backend.modules.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
public class IniciarProcesoRequest {

    @NotBlank(message = "El templateId es obligatorio")
    private String templateId;

    private String clienteId;

    private String prioridad = "NORMAL";
    private Map<String, Object> datosFormulario = new HashMap<>();
}
