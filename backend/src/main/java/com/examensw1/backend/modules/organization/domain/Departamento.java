package com.examensw1.backend.modules.organization.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@Document(collection = "departamentos")
public class Departamento {

    @Id
    private String id;

    private String nombre;
    private String descripcion;
    private boolean activo = true;

    @CreatedDate
    private LocalDateTime createdAt;
}
