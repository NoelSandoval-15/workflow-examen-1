package com.examensw1.backend.modules.organization.controller;

import com.examensw1.backend.modules.organization.dto.CreateOrganizationRequest;
import com.examensw1.backend.modules.organization.dto.DepartamentoDTO;
import com.examensw1.backend.modules.organization.dto.RolDTO;
import com.examensw1.backend.modules.organization.service.OrganizationService;
import com.examensw1.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organization")
@RequiredArgsConstructor
@Tag(name = "Organización", description = "Gestión de departamentos y roles")
@SecurityRequirement(name = "bearerAuth")
public class OrganizationController {

    private final OrganizationService organizationService;

    // --- DEPARTAMENTOS ---

    @PostMapping("/departamentos")
    public ResponseEntity<ApiResponse<DepartamentoDTO>> crearDepartamento(
            @Valid @RequestBody CreateOrganizationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Departamento creado", organizationService.crearDepartamento(request)));
    }

    @GetMapping("/departamentos")
    public ResponseEntity<ApiResponse<List<DepartamentoDTO>>> listarDepartamentos() {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.listarDepartamentos()));
    }

    @GetMapping("/departamentos/{id}")
    public ResponseEntity<ApiResponse<DepartamentoDTO>> obtenerDepartamento(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.obtenerDepartamento(id)));
    }

    @DeleteMapping("/departamentos/{id}")
    public ResponseEntity<ApiResponse<Void>> desactivarDepartamento(@PathVariable String id) {
        organizationService.desactivarDepartamento(id);
        return ResponseEntity.ok(ApiResponse.ok("Departamento desactivado", null));
    }

    // --- ROLES ---

    @PostMapping("/roles")
    public ResponseEntity<ApiResponse<RolDTO>> crearRol(
            @Valid @RequestBody CreateOrganizationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Rol creado", organizationService.crearRol(request)));
    }

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<RolDTO>>> listarRoles() {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.listarRoles()));
    }

    @GetMapping("/roles/{id}")
    public ResponseEntity<ApiResponse<RolDTO>> obtenerRol(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(organizationService.obtenerRol(id)));
    }

    @DeleteMapping("/roles/{id}")
    public ResponseEntity<ApiResponse<Void>> desactivarRol(@PathVariable String id) {
        organizationService.desactivarRol(id);
        return ResponseEntity.ok(ApiResponse.ok("Rol desactivado", null));
    }
}
