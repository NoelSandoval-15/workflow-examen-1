package com.examensw1.backend.modules.workflow.controller;

import com.examensw1.backend.modules.workflow.dto.*;
import com.examensw1.backend.modules.workflow.service.WorkflowEngineService;
import com.examensw1.backend.modules.workflow.service.WorkflowService;
import com.examensw1.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
@Tag(name = "Workflow", description = "Motor de gestión de procesos y trámites")
@SecurityRequirement(name = "bearerAuth")
public class WorkflowController {

    private final WorkflowService workflowService;
    private final WorkflowEngineService workflowEngineService;

    // --- TEMPLATES ---

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<WorkflowDTO>> crearTemplate(
            @Valid @RequestBody CreateWorkflowRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Template creado", workflowService.crearTemplate(request, userDetails.getUsername())));
    }

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<WorkflowDTO>>> listarTemplates() {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.listarTemplates()));
    }

    @GetMapping("/templates/{id}")
    public ResponseEntity<ApiResponse<WorkflowDTO>> obtenerTemplate(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.obtenerTemplate(id)));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<ApiResponse<WorkflowDTO>> actualizarTemplate(
            @PathVariable String id,
            @RequestBody CreateWorkflowRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Template actualizado", workflowService.actualizarTemplate(id, request)));
    }

    @PutMapping("/templates/{id}/activar")
    public ResponseEntity<ApiResponse<WorkflowDTO>> activarTemplate(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok("Template activado", workflowService.activarTemplate(id)));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<ApiResponse<Void>> desactivarTemplate(@PathVariable String id) {
        workflowService.desactivarTemplate(id);
        return ResponseEntity.ok(ApiResponse.ok("Template desactivado", null));
    }

    @GetMapping("/templates/{id}/simular")
    public ResponseEntity<ApiResponse<SimulationResultDTO>> simular(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.simularTemplate(id)));
    }

    // --- INSTANCIAS (TRAMITES) ---

    @PostMapping("/instancias")
    public ResponseEntity<ApiResponse<ProcesoInstanciaDTO>> iniciarProceso(
            @Valid @RequestBody IniciarProcesoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Trámite iniciado", workflowEngineService.iniciarProceso(request, userDetails.getUsername())));
    }

    @GetMapping("/instancias")
    public ResponseEntity<ApiResponse<List<ProcesoInstanciaDTO>>> listarInstancias() {
        return ResponseEntity.ok(ApiResponse.ok(workflowEngineService.listarInstancias()));
    }

    @GetMapping("/instancias/{id}")
    public ResponseEntity<ApiResponse<ProcesoInstanciaDTO>> obtenerInstancia(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(workflowEngineService.obtenerInstancia(id)));
    }

    @PutMapping("/instancias/{id}/avanzar")
    public ResponseEntity<ApiResponse<ProcesoInstanciaDTO>> avanzar(
            @PathVariable String id,
            @RequestBody(required = false) AvanzarNodoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        AvanzarNodoRequest req = request != null ? request : new AvanzarNodoRequest();
        return ResponseEntity.ok(ApiResponse.ok("Trámite avanzado",
                workflowEngineService.avanzarNodo(id, userDetails.getUsername(), req.getObservacion(), req.getCondicion())));
    }

    @PutMapping("/instancias/{id}/rechazar")
    public ResponseEntity<ApiResponse<ProcesoInstanciaDTO>> rechazar(
            @PathVariable String id,
            @RequestParam String motivo,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.ok("Trámite rechazado",
                workflowEngineService.rechazarNodo(id, userDetails.getUsername(), motivo)));
    }
}
