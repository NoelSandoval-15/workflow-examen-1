package com.examensw1.backend.modules.organization.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class RolDTO {
    private String id;
    private String nombre;
    private String descripcion;
    private boolean activo;
    private LocalDateTime createdAt;
}
