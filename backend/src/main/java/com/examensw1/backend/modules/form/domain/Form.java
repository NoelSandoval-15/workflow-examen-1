package com.examensw1.backend.modules.form.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Document(collection = "formularios")
public class Form {

    @Id
    private String id;

    private String nombre;
    private String tipoSolicitud;
    private int version = 1;
    private boolean activo = true;
    private List<FormField> campos = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;
}
