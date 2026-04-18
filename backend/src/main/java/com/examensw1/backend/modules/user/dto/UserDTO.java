package com.examensw1.backend.modules.user.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class UserDTO {
    private String id;
    private String rolId;
    private String departamentoId;
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
    private String username;
    private boolean activo;
    private LocalDateTime ultimoAcceso;
    private LocalDateTime createdAt;
}
