package com.examensw1.backend.modules.task.controller;

import com.examensw1.backend.modules.task.dto.CreateTaskRequest;
import com.examensw1.backend.modules.task.dto.TaskDTO;
import com.examensw1.backend.modules.task.dto.UpdateTaskRequest;
import com.examensw1.backend.modules.task.service.TaskService;
import com.examensw1.backend.modules.user.repository.UserRepository;
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
@RequestMapping("/api/tareas")
@RequiredArgsConstructor
@Tag(name = "Tareas", description = "Gestión de tareas por nodo del workflow")
@SecurityRequirement(name = "bearerAuth")
public class TaskController {

    private final TaskService taskService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<TaskDTO>> crear(@Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tarea creada", taskService.crearTarea(request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskDTO>> obtener(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.obtenerTarea(id)));
    }

    /** Tareas del usuario autenticado — el funcionario ve solo las suyas */
    @GetMapping("/mis-tareas")
    public ResponseEntity<ApiResponse<List<TaskDTO>>> misTareas(
            @AuthenticationPrincipal UserDetails userDetails) {
        return userRepository.findByUsername(userDetails.getUsername())
                .map(user -> ResponseEntity.ok(
                        ApiResponse.ok(taskService.listarPorUsuario(user.getId()))))
                .orElse(ResponseEntity.ok(ApiResponse.ok(List.of())));
    }

    @GetMapping("/instancia/{procesoInstanciaId}")
    public ResponseEntity<ApiResponse<List<TaskDTO>>> listarPorInstancia(@PathVariable String procesoInstanciaId) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.listarPorInstancia(procesoInstanciaId)));
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<ApiResponse<List<TaskDTO>>> listarPorUsuario(@PathVariable String usuarioId) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.listarPorUsuario(usuarioId)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskDTO>> actualizar(
            @PathVariable String id, @RequestBody UpdateTaskRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Tarea actualizada", taskService.actualizarTarea(id, request)));
    }

    @PutMapping("/{id}/completar")
    public ResponseEntity<ApiResponse<TaskDTO>> completar(
            @PathVariable String id,
            @RequestParam(defaultValue = "") String observacion) {
        return ResponseEntity.ok(ApiResponse.ok("Tarea completada", taskService.completarTarea(id, observacion)));
    }
}
