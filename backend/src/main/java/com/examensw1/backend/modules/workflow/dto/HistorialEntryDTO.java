package com.examensw1.backend.modules.workflow.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class HistorialEntryDTO {
    private String nodoId;
    private String nodoNombre;
    private String usuarioId;
    private String usuarioNombre;
    private String accion;
    private String observacion;
    private LocalDateTime fecha;
}
