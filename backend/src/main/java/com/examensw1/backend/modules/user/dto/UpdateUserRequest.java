package com.examensw1.backend.modules.user.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserRequest {
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
    private String rolId;
    private String departamentoId;
}
