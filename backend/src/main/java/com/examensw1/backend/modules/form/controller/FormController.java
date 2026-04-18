package com.examensw1.backend.modules.form.controller;

import com.examensw1.backend.modules.form.dto.FormDTO;
import com.examensw1.backend.modules.form.dto.FormSubmissionDTO;
import com.examensw1.backend.modules.form.service.FormService;
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
@RequestMapping("/api/formularios")
@RequiredArgsConstructor
@Tag(name = "Formularios", description = "Formularios dinámicos por nodo")
@SecurityRequirement(name = "bearerAuth")
public class FormController {

    private final FormService formService;

    @PostMapping
    public ResponseEntity<ApiResponse<FormDTO>> crear(@RequestBody FormDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Formulario creado", formService.crearFormulario(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FormDTO>>> listar() {
        return ResponseEntity.ok(ApiResponse.ok(formService.listarFormularios()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FormDTO>> obtener(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(formService.obtenerFormulario(id)));
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<Void>> submit(@Valid @RequestBody FormSubmissionDTO submission) {
        formService.submitFormulario(submission);
        return ResponseEntity.ok(ApiResponse.ok("Formulario enviado", null));
    }
}
