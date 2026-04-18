package com.examensw1.backend.modules.form.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FormFieldDTO {
    private String id;
    private String nombre;
    private String etiqueta;
    private String tipo;
    private boolean requerido;
    private String valorDefault;
    private int orden;
}
