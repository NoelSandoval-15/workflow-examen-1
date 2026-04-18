package com.examensw1.backend.modules.notification.service;

import com.examensw1.backend.modules.notification.domain.Notification;
import com.examensw1.backend.modules.notification.dto.NotificationDTO;
import com.examensw1.backend.modules.notification.repository.NotificationRepository;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void enviarNotificacion(String usuarioId, String titulo, String mensaje,
                                    String tipo, String referenciaId) {
        Notification notif = new Notification();
        notif.setUsuarioId(usuarioId);
        notif.setTitulo(titulo);
        notif.setMensaje(mensaje);
        notif.setTipo(tipo);
        notif.setReferenciaId(referenciaId);
        notif.setLeida(false);

        NotificationDTO dto = toDTO(notificationRepository.save(notif));

        messagingTemplate.convertAndSendToUser(
                usuarioId,
                "/queue/notificaciones",
                dto
        );
    }

    @Override
    public List<NotificationDTO> listarPorUsuario(String usuarioId) {
        return notificationRepository.findByUsuarioIdOrderByCreatedAtDesc(usuarioId)
                .stream().map(this::toDTO).toList();
    }

    @Override
    public List<NotificationDTO> listarNoLeidas(String usuarioId) {
        return notificationRepository.findByUsuarioIdAndLeidaFalse(usuarioId)
                .stream().map(this::toDTO).toList();
    }

    @Override
    public long contarNoLeidas(String usuarioId) {
        return notificationRepository.countByUsuarioIdAndLeidaFalse(usuarioId);
    }

    @Override
    public NotificationDTO marcarLeida(String notificacionId) {
        Notification notif = notificationRepository.findById(notificacionId)
                .orElseThrow(() -> new ResourceNotFoundException("Notificación", notificacionId));
        notif.setLeida(true);
        return toDTO(notificationRepository.save(notif));
    }

    @Override
    public void marcarTodasLeidas(String usuarioId) {
        List<Notification> pendientes = notificationRepository.findByUsuarioIdAndLeidaFalse(usuarioId);
        pendientes.forEach(n -> n.setLeida(true));
        notificationRepository.saveAll(pendientes);
    }

    private NotificationDTO toDTO(Notification n) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(n.getId());
        dto.setUsuarioId(n.getUsuarioId());
        dto.setTitulo(n.getTitulo());
        dto.setMensaje(n.getMensaje());
        dto.setTipo(n.getTipo());
        dto.setReferenciaId(n.getReferenciaId());
        dto.setLeida(n.isLeida());
        dto.setCreatedAt(n.getCreatedAt());
        return dto;
    }
}
