package com.examensw1.backend.modules.workflow.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Document(collection = "proceso_instancias")
public class ProcesoInstancia {

    @Id
    private String id;

    private String codigo;
    private String templateId;
    private String clienteId;
    private String estadoActual = "NUEVO";
    private String prioridad = "NORMAL";

    private WorkflowNode nodoActual;
    private String responsableActualId;

    private Map<String, Object> datosFormulario = new HashMap<>();
    private List<HistorialEntry> historialResumen = new ArrayList<>();

    @CreatedDate
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime finishedAt;
}
