package com.examensw1.backend.modules.notification.repository;

import com.examensw1.backend.modules.notification.domain.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUsuarioIdOrderByCreatedAtDesc(String usuarioId);
    List<Notification> findByUsuarioIdAndLeidaFalse(String usuarioId);
    long countByUsuarioIdAndLeidaFalse(String usuarioId);
}
