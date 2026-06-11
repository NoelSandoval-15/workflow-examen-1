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
    /**
     * Clave de sesión para OnlyOffice. Todos los usuarios que abran el mismo documento
     * deben usar la MISMA key para unirse a la misma sesión colaborativa.
     * Se regenera con UUID nuevo cada vez que el documento es guardado exitosamente,
     * forzando a OnlyOffice a recargar desde S3 en la siguiente apertura.
     */
    private String versionKey;

    @CreatedDate
    private LocalDateTime createdAt;
}
