package com.examensw1.backend.modules.workflow.domain;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class HistorialEntry {
    private String nodoId;
    private String nodoNombre;
    private String usuarioId;
    private String usuarioNombre;
    private String accion;
    private String observacion;
    private LocalDateTime fecha;
}
