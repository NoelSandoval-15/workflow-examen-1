package com.examensw1.backend.modules.form.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class FormDTO {
    private String id;
    private String nombre;
    private String tipoSolicitud;
    private int version;
    private boolean activo;
    private List<FormFieldDTO> campos;
    private LocalDateTime createdAt;
}
