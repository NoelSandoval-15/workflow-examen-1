package com.examensw1.backend.modules.user.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@Document(collection = "usuarios")
public class User {

    @Id
    private String id;

    private String rolId;
    private String departamentoId;
    private String nombre;
    private String apellido;

    @Indexed(unique = true)
    private String correo;

    private String telefono;

    @Indexed(unique = true)
    private String username;

    private String passwordHash;
    private boolean activo = true;
    private LocalDateTime ultimoAcceso;

    @CreatedDate
    private LocalDateTime createdAt;
}
