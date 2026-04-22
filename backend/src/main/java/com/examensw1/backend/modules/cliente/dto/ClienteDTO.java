package com.examensw1.backend.modules.cliente.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ClienteDTO {
    private String id;
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
    private String direccion;
    private boolean activo;
    private LocalDateTime createdAt;
}
