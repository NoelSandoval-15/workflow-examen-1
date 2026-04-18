package com.examensw1.backend.modules.notification.controller;

import com.examensw1.backend.modules.notification.dto.NotificationDTO;
import com.examensw1.backend.modules.notification.service.NotificationService;
import com.examensw1.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
@Tag(name = "Notificaciones", description = "Gestión de notificaciones de usuario")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> listar(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(
                notificationService.listarPorUsuario(userDetails.getUsername())));
    }

    @GetMapping("/no-leidas")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> noLeidas(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok(
                notificationService.listarNoLeidas(userDetails.getUsername())));
    }

    @GetMapping("/contador")
    public ResponseEntity<ApiResponse<Map<String, Long>>> contador(
            @AuthenticationPrincipal UserDetails userDetails) {
        long count = notificationService.contarNoLeidas(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("noLeidas", count)));
    }

    @PutMapping("/{id}/leer")
    public ResponseEntity<ApiResponse<NotificationDTO>> marcarLeida(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok("Notificación marcada como leída",
                notificationService.marcarLeida(id)));
    }

    @PutMapping("/leer-todas")
    public ResponseEntity<ApiResponse<Void>> marcarTodasLeidas(
            @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.marcarTodasLeidas(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Todas marcadas como leídas", null));
    }
}
