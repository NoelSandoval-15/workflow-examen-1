package com.examensw1.backend.modules.cliente.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateClienteRequest {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    private String apellido;
    private String correo;
    private String telefono;
    private String direccion;
}
