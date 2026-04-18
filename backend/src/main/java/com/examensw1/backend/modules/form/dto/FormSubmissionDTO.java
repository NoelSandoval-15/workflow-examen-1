package com.examensw1.backend.modules.form.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class FormSubmissionDTO {
    @NotBlank
    private String formularioId;
    @NotBlank
    private String procesoInstanciaId;
    private Map<String, Object> datos;
}
