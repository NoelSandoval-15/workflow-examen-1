package com.examensw1.backend.modules.cliente.controller;

import com.examensw1.backend.modules.cliente.dto.ClienteDTO;
import com.examensw1.backend.modules.cliente.dto.CreateClienteRequest;
import com.examensw1.backend.modules.cliente.service.ClienteService;
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
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
@Tag(name = "Clientes", description = "Gestión de clientes del sistema")
@SecurityRequirement(name = "bearerAuth")
public class ClienteController {

    private final ClienteService clienteService;

    @PostMapping
    public ResponseEntity<ApiResponse<ClienteDTO>> crear(@Valid @RequestBody CreateClienteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Cliente creado", clienteService.crear(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ClienteDTO>>> listar() {
        return ResponseEntity.ok(ApiResponse.ok(clienteService.listar()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClienteDTO>> obtener(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(clienteService.obtener(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ClienteDTO>> actualizar(
            @PathVariable String id,
            @RequestBody CreateClienteRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Cliente actualizado", clienteService.actualizar(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> desactivar(@PathVariable String id) {
        clienteService.desactivar(id);
        return ResponseEntity.ok(ApiResponse.ok("Cliente desactivado", null));
    }
}
