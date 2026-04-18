package com.examensw1.backend.modules.file.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@Document(collection = "archivos")
public class FileMetadata {

    @Id
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

    @CreatedDate
    private LocalDateTime createdAt;
}
