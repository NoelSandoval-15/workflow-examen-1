package com.examensw1.backend.modules.workflow.controller;

import com.examensw1.backend.modules.workflow.dto.CollaborationLinkDTO;
import com.examensw1.backend.modules.workflow.dto.CollaborationSessionDTO;
import com.examensw1.backend.modules.workflow.service.WorkflowCollaborationService;
import com.examensw1.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
@Tag(name = "Colaboración", description = "Gestión de enlaces colaborativos para diseño en tiempo real")
public class WorkflowCollaborationController {

    private final WorkflowCollaborationService collaborationService;

    /** Genera (o devuelve si ya existe) el link colaborativo del template */
    @PostMapping("/templates/{id}/collaboration-link")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CollaborationLinkDTO>> generarLink(
            @PathVariable String id,
            HttpServletRequest request) {
        String baseUrl = resolverBaseUrl(request);
        return ResponseEntity.ok(ApiResponse.ok("Link generado",
                collaborationService.generarLink(id, baseUrl)));
    }

    /** Regenera el link, invalidando el anterior */
    @PostMapping("/templates/{id}/collaboration-link/regenerate")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CollaborationLinkDTO>> regenerarLink(
            @PathVariable String id,
            HttpServletRequest request) {
        String baseUrl = resolverBaseUrl(request);
        return ResponseEntity.ok(ApiResponse.ok("Link regenerado",
                collaborationService.regenerarLink(id, baseUrl)));
    }

    /** Revoca el link colaborativo */
    @DeleteMapping("/templates/{id}/collaboration-link")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> revocarLink(@PathVariable String id) {
        collaborationService.revocarLink(id);
        return ResponseEntity.ok(ApiResponse.ok("Link revocado", null));
    }

    /** Endpoint público: resuelve el token y devuelve los datos del flujo.
     *  No requiere JWT — el token ES la credencial de acceso. */
    @GetMapping("/collaborate/{token}")
    public ResponseEntity<ApiResponse<CollaborationSessionDTO>> resolverToken(
            @PathVariable String token) {
        return ResponseEntity.ok(ApiResponse.ok(
                collaborationService.resolverToken(token)));
    }

    /** Detecta automáticamente la URL base del frontend según la cabecera Origin */
    private String resolverBaseUrl(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) return origin;
        // Fallback local para desarrollo
        return "http://localhost:4200";
    }
}
