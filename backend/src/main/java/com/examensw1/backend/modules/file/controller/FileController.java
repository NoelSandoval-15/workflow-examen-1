package com.examensw1.backend.modules.file.controller;

import com.examensw1.backend.modules.file.dto.FileDTO;
import com.examensw1.backend.modules.file.service.FileService;
import com.examensw1.backend.shared.response.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/archivos")
@RequiredArgsConstructor
@Tag(name = "Archivos", description = "Gestión de archivos y evidencias")
@SecurityRequirement(name = "bearerAuth")
public class FileController {

    private final FileService fileService;

    @PostMapping(value = "/subir", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FileDTO>> subir(
            @RequestParam MultipartFile file,
            @RequestParam String procesoInstanciaId,
            @RequestParam(required = false) String tareaId,
            @RequestParam(defaultValue = "false") boolean esEvidencia,
            @RequestParam(defaultValue = "") String descripcion,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Archivo subido",
                fileService.subirArchivo(file, procesoInstanciaId, tareaId,
                        userDetails.getUsername(), esEvidencia, descripcion)));
    }

    @GetMapping("/instancia/{procesoInstanciaId}")
    public ResponseEntity<ApiResponse<List<FileDTO>>> listarPorInstancia(@PathVariable String procesoInstanciaId) {
        return ResponseEntity.ok(ApiResponse.ok(fileService.listarPorInstancia(procesoInstanciaId)));
    }

    @GetMapping("/tarea/{tareaId}")
    public ResponseEntity<ApiResponse<List<FileDTO>>> listarPorTarea(@PathVariable String tareaId) {
        return ResponseEntity.ok(ApiResponse.ok(fileService.listarPorTarea(tareaId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> eliminar(@PathVariable String id) {
        fileService.eliminarArchivo(id);
        return ResponseEntity.ok(ApiResponse.ok("Archivo eliminado", null));
    }
}
