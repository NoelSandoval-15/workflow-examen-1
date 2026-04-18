package com.examensw1.backend.modules.notification.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notificaciones")
@Getter
@Setter
public class Notification {

    @Id
    private String id;

    private String usuarioId;
    private String titulo;
    private String mensaje;
    private String tipo;
    private String referenciaId;
    private boolean leida = false;

    @CreatedDate
    private LocalDateTime createdAt;
}
