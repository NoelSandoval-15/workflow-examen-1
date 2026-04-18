package com.examensw1.backend.modules.workflow.service;

import com.examensw1.backend.modules.workflow.dto.*;

import java.util.List;

public interface WorkflowService {
    WorkflowDTO crearTemplate(CreateWorkflowRequest request, String usuarioId);
    WorkflowDTO obtenerTemplate(String id);
    List<WorkflowDTO> listarTemplates();
    WorkflowDTO activarTemplate(String id);
    void desactivarTemplate(String id);
    SimulationResultDTO simularTemplate(String id);
}
