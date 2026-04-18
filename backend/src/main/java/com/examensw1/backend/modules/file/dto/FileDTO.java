package com.examensw1.backend.modules.file.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class FileDTO {
    private String id;
    private String procesoInstanciaId;
    private String tareaId;
    private String subidoPorId;
    private String nombreArchivo;
    private String ruta;
    private String mimeType;
    private String extension;
    private long tamanoBytes;
    private boolean esEvidencia;
    private String descripcion;
    private LocalDateTime createdAt;
}
