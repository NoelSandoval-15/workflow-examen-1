package com.examensw1.backend.modules.workflow.service;

import com.examensw1.backend.modules.workflow.domain.Workflow;
import com.examensw1.backend.modules.workflow.dto.*;
import com.examensw1.backend.modules.workflow.repository.WorkflowRepository;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowCollaborationServiceImpl implements WorkflowCollaborationService {

    private final WorkflowRepository workflowRepository;
    private final WorkflowServiceImpl workflowServiceImpl; // reutiliza el toDTO existente

    @Override
    public CollaborationLinkDTO generarLink(String templateId, String frontendBaseUrl) {
        Workflow workflow = workflowRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", templateId));

        // Si ya tiene token activo, lo devuelve sin generar uno nuevo
        if (Boolean.TRUE.equals(workflow.getCollaborationEnabled())
                && workflow.getCollaborationToken() != null
                && workflow.getCollaborationRevokedAt() == null) {
            return buildLinkDTO(workflow, frontendBaseUrl);
        }

        return activarColaboracion(workflow, frontendBaseUrl);
    }

    @Override
    public CollaborationLinkDTO regenerarLink(String templateId, String frontendBaseUrl) {
        Workflow workflow = workflowRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", templateId));
        return activarColaboracion(workflow, frontendBaseUrl);
    }

    @Override
    public void revocarLink(String templateId) {
        Workflow workflow = workflowRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", templateId));
        workflow.setCollaborationEnabled(false);
        workflow.setCollaborationRevokedAt(LocalDateTime.now());
        workflowRepository.save(workflow);
        log.info("Colaboración revocada para template '{}'", workflow.getNombre());
    }

    @Override
    public CollaborationSessionDTO resolverToken(String token) {
        Workflow workflow = workflowRepository.findByCollaborationToken(token)
                .orElseThrow(() -> new BusinessException("Link de colaboración inválido o expirado"));

        if (!Boolean.TRUE.equals(workflow.getCollaborationEnabled())
                || workflow.getCollaborationRevokedAt() != null) {
            throw new BusinessException("El link de colaboración ha sido revocado");
        }

        CollaborationSessionDTO session = new CollaborationSessionDTO();
        session.setTemplateId(workflow.getId());
        session.setTemplateNombre(workflow.getNombre());
        session.setTipoSolicitud(workflow.getTipoSolicitud());
        session.setBpmnXml(workflow.getBpmnXml());
        session.setCollaborationVersion(workflow.getCollaborationVersion());
        session.setCollaborationUpdatedAt(workflow.getCollaborationUpdatedAt());

        // Mapear nodos y conexiones usando el mismo método del servicio principal
        WorkflowDTO dto = workflowServiceImpl.toDTO(workflow);
        session.setNodos(dto.getNodos());
        session.setConexiones(dto.getConexiones());

        return session;
    }

    // ── Helpers ────────────────────────────────────────────────────

    private CollaborationLinkDTO activarColaboracion(Workflow workflow, String frontendBaseUrl) {
        workflow.setCollaborationToken(UUID.randomUUID().toString());
        workflow.setCollaborationEnabled(true);
        workflow.setCollaborationRevokedAt(null);
        workflow.setCollaborationVersion(0L);
        workflow.setCollaborationUpdatedAt(LocalDateTime.now());
        workflowRepository.save(workflow);
        log.info("Link colaborativo generado para template '{}'", workflow.getNombre());
        return buildLinkDTO(workflow, frontendBaseUrl);
    }

    private CollaborationLinkDTO buildLinkDTO(Workflow workflow, String frontendBaseUrl) {
        String url = frontendBaseUrl + "/flujos/colaborar/" + workflow.getCollaborationToken();
        return new CollaborationLinkDTO(
                workflow.getId(),
                workflow.getNombre(),
                workflow.getCollaborationToken(),
                url,
                workflow.getCollaborationEnabled()
        );
    }
}
