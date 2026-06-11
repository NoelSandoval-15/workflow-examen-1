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

    @GetMapping
    public ResponseEntity<ApiResponse<List<FileDTO>>> listarTodos() {
        return ResponseEntity.ok(ApiResponse.ok(fileService.listarTodos()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FileDTO>> obtenerPorId(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok("Archivo encontrado", fileService.obtenerPorId(id)));
    }

    @GetMapping("/descargar/{id}")
    public ResponseEntity<org.springframework.core.io.Resource> descargar(@PathVariable String id) {
        FileDTO fileDTO = fileService.obtenerPorId(id);
        try {
            byte[] data = fileService.obtenerContenidoArchivo(id);
            org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(data);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileDTO.getNombreArchivo() + "\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(data.length)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/ver/{id}")
    public ResponseEntity<org.springframework.core.io.Resource> ver(@PathVariable String id) {
        FileDTO fileDTO = fileService.obtenerPorId(id);
        try {
            byte[] data = fileService.obtenerContenidoArchivo(id);
            org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(data);
            org.springframework.http.MediaType contentType = org.springframework.http.MediaType.parseMediaType(fileDTO.getMimeType() != null ? fileDTO.getMimeType() : "application/octet-stream");
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileDTO.getNombreArchivo() + "\"")
                    .contentType(contentType)
                    .contentLength(data.length)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/presigned/{id}")
    public ResponseEntity<ApiResponse<String>> presigned(@PathVariable String id) {
        String url = fileService.generarPresignedUrl(id);
        return ResponseEntity.ok(ApiResponse.ok("URL generada", url));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> eliminar(@PathVariable String id) {
        fileService.eliminarArchivo(id);
        return ResponseEntity.ok(ApiResponse.ok("Archivo eliminado", null));
    }

    @PostMapping("/callback/{id}")
    public ResponseEntity<?> callback(@PathVariable String id, @RequestBody java.util.Map<String, Object> body) {
        if (body.containsKey("status")) {
            int status = ((Number) body.get("status")).intValue();
            // status=2: el documento fue cerrado y está listo para guardar
            // status=6: OnlyOffice hizo un autosave forzado (cada ~10 min por defecto)
            // Ambos incluyen una URL con el contenido actualizado del documento
            if ((status == 2 || status == 6) && body.containsKey("url")) {
                String downloadUrl = (String) body.get("url");
                try {
                    fileService.actualizarArchivoDesdeUrl(id, downloadUrl, status == 2);
                } catch (Exception e) {
                    // IMPORTANTE: OnlyOffice REQUIERE {"error":0} incluso si el guardado falla internamente.
                    // Si devolvemos cualquier otro status HTTP, OnlyOffice lo interpreta como
                    // fallo del callback y puede reintentar o bloquear la sesión colaborativa.
                    // El error se registra en logs pero NO se propaga al GlobalExceptionHandler.
                    System.err.println("[FileCallback] Error al guardar documento id=" + id
                            + " status=" + status + ": " + e.getMessage());
                }
            }
        }
        // OnlyOffice requiere exactamente { "error": 0 } para confirmar recepción exitosa
        return ResponseEntity.ok(java.util.Map.of("error", 0));
    }
}
