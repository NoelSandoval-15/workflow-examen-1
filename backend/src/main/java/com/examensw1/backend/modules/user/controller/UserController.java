package com.examensw1.backend.modules.user.controller;

import com.examensw1.backend.modules.user.dto.CreateUserRequest;
import com.examensw1.backend.modules.user.dto.UpdateUserRequest;
import com.examensw1.backend.modules.user.dto.UserDTO;
import com.examensw1.backend.modules.user.service.UserService;
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
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@Tag(name = "Usuarios", description = "Gestión de usuarios del sistema")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<ApiResponse<UserDTO>> crear(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Usuario creado", userService.crearUsuario(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDTO>>> listar() {
        return ResponseEntity.ok(ApiResponse.ok(userService.listarUsuarios()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> obtener(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.obtenerUsuario(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> actualizar(
            @PathVariable String id, @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Usuario actualizado", userService.actualizarUsuario(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> desactivar(@PathVariable String id) {
        userService.desactivarUsuario(id);
        return ResponseEntity.ok(ApiResponse.ok("Usuario desactivado", null));
    }
}
