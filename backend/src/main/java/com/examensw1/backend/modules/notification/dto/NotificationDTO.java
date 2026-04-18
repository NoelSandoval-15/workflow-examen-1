package com.examensw1.backend.modules.notification.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class NotificationDTO {
    private String id;
    private String usuarioId;
    private String titulo;
    private String mensaje;
    private String tipo;
    private String referenciaId;
    private boolean leida;
    private LocalDateTime createdAt;
}
