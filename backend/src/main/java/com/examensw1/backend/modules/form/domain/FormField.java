package com.examensw1.backend.modules.form.domain;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FormField {
    private String id;
    private String nombre;
    private String etiqueta;
    private String tipo;
    private boolean requerido;
    private String valorDefault;
    private int orden;
}
