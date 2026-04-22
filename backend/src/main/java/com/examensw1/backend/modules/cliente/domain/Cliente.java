package com.examensw1.backend.modules.cliente.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@Document(collection = "clientes")
public class Cliente {

    @Id
    private String id;

    private String nombre;
    private String apellido;

    @Indexed(unique = true, sparse = true)
    private String correo;

    private String telefono;
    private String direccion;
    private boolean activo = true;

    @CreatedDate
    private LocalDateTime createdAt;
}
