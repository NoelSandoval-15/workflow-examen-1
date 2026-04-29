package com.examensw1.backend.modules.task.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@Document(collection = "tareas")
public class Task {

    @Id
    private String id;

    private String procesoInstanciaId;
    private String procesoInstanciaCodigo;
    private String nodoId;
    private String nombre;
    private String tipo;
    private String estado = "PENDIENTE";
    private String departamentoAsignadoId;
    private String usuarioAsignadoId;
    private boolean requiereEvidencia;
    private String observacion;

    private LocalDateTime fechaInicio;
    private LocalDateTime fechaLimite;
    private LocalDateTime fechaCompletado;

    @CreatedDate
    private LocalDateTime createdAt;
}
