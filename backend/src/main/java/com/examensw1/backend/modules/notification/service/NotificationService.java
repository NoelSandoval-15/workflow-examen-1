package com.examensw1.backend.modules.notification.service;

import com.examensw1.backend.modules.notification.dto.NotificationDTO;

import java.util.List;

public interface NotificationService {
    void enviarNotificacion(String usuarioId, String titulo, String mensaje, String tipo, String referenciaId);
    List<NotificationDTO> listarPorUsuario(String usuarioId);
    List<NotificationDTO> listarNoLeidas(String usuarioId);
    long contarNoLeidas(String usuarioId);
    NotificationDTO marcarLeida(String notificacionId);
    void marcarTodasLeidas(String usuarioId);
}
