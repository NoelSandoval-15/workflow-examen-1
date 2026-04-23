package com.examensw1.backend.modules.workflow.service;

import com.examensw1.backend.modules.workflow.domain.Workflow;
import com.examensw1.backend.modules.workflow.domain.WorkflowEdge;
import com.examensw1.backend.modules.workflow.domain.WorkflowNode;
import com.examensw1.backend.modules.workflow.dto.*;
import com.examensw1.backend.modules.workflow.repository.WorkflowRepository;
import com.examensw1.backend.shared.enums.NodeType;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.camunda.bpm.engine.RepositoryService;
import org.camunda.bpm.engine.repository.Deployment;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowServiceImpl implements WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final RepositoryService repositoryService;
    private final BpmnXmlGenerator bpmnXmlGenerator;

    @Override
    public WorkflowDTO crearTemplate(CreateWorkflowRequest request, String usuarioId) {
        Workflow workflow = new Workflow();
        workflow.setNombre(request.getNombre());
        workflow.setTipoSolicitud(request.getTipoSolicitud());
        workflow.setFormularioId(request.getFormularioId());
        workflow.setCreatedBy(usuarioId);
        workflow.setEstado("BORRADOR");
        workflow.setBpmnXml(request.getBpmnXml());

        if (request.getNodos() != null) {
            request.getNodos().forEach(n -> {
                WorkflowNode node = new WorkflowNode();
                node.setId(n.getId());
                node.setNombre(n.getNombre());
                node.setTipo(n.getTipo());
                node.setDepartamentoId(n.getDepartamentoId());
                node.setRolRequerido(n.getRolRequerido());
                node.setFormularioId(n.getFormularioId());
                node.setRequiereEvidencia(n.isRequiereEvidencia());
                node.setTiempoLimiteHoras(n.getTiempoLimiteHoras());
                node.setOrden(n.getOrden());
                workflow.getNodos().add(node);
            });
        }

        if (request.getConexiones() != null) {
            request.getConexiones().forEach(e -> {
                WorkflowEdge edge = new WorkflowEdge();
                edge.setId(e.getId());
                edge.setNodoOrigenId(e.getNodoOrigenId());
                edge.setNodoDestinoId(e.getNodoDestinoId());
                edge.setCondicion(e.getCondicion());
                edge.setEtiqueta(e.getEtiqueta());
                workflow.getConexiones().add(edge);
            });
        }

        return toDTO(workflowRepository.save(workflow));
    }

    @Override
    public WorkflowDTO obtenerTemplate(String id) {
        return toDTO(workflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template", id)));
    }

    @Override
    public List<WorkflowDTO> listarTemplates() {
        return workflowRepository.findAll().stream().map(this::toDTO).toList();
    }

    @Override
    public WorkflowDTO activarTemplate(String id) {
        Workflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template", id));

        if (workflow.getNodos().isEmpty()) {
            throw new BusinessException("No se puede activar un template sin nodos");
        }

        // Obtener o generar el BPMN XML
        String xml = (workflow.getBpmnXml() != null && !workflow.getBpmnXml().isBlank())
                ? normalizeBpmnXmlForCamunda(workflow)
                : bpmnXmlGenerator.generate(workflow);

        String processKey = bpmnXmlGenerator.sanitizeKey(workflow.getId());

        // Desplegar en Camunda
        try {
            Deployment deployment = repositoryService.createDeployment()
                    .name(workflow.getNombre())
                    .addInputStream(
                            processKey + ".bpmn",
                            new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8))
                    )
                    .enableDuplicateFiltering(false)
                    .deploy();

            workflow.setCamundaDeploymentId(deployment.getId());
            workflow.setCamundaProcessDefinitionKey(processKey);
            log.info("Template '{}' desplegado en Camunda. DeploymentId={}, ProcessKey={}",
                    workflow.getNombre(), deployment.getId(), processKey);
        } catch (Exception e) {
            log.error("Error al desplegar template en Camunda: {}", e.getMessage(), e);
            throw new BusinessException("Error al desplegar el flujo en el motor: " + e.getMessage());
        }

        workflow.setEstado("ACTIVO");
        return toDTO(workflowRepository.save(workflow));
    }

    @Override
    public void desactivarTemplate(String id) {
        Workflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template", id));
        workflow.setEstado("INACTIVO");
        workflowRepository.save(workflow);
    }

    @Override
    public SimulationResultDTO simularTemplate(String id) {
        Workflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template", id));

        SimulationResultDTO result = new SimulationResultDTO();
        result.setTemplateId(id);
        result.setTemplateNombre(workflow.getNombre());
        result.setTotalNodos(workflow.getNodos().size());

        List<String> errores = new ArrayList<>();
        List<String> recorrido = new ArrayList<>();

        boolean tieneInicio = workflow.getNodos().stream().anyMatch(n -> NodeType.INICIO.equals(n.getTipo()));
        boolean tieneFin    = workflow.getNodos().stream().anyMatch(n -> NodeType.FIN.equals(n.getTipo()));

        if (!tieneInicio) errores.add("El flujo no tiene nodo de INICIO");
        if (!tieneFin)    errores.add("El flujo no tiene nodo de FIN");
        if (workflow.getNodos().size() < 2) errores.add("El flujo necesita al menos 2 nodos");

        workflow.getNodos().stream()
                .sorted((a, b) -> Integer.compare(a.getOrden(), b.getOrden()))
                .forEach(n -> recorrido.add(n.getOrden() + ". " + n.getNombre() + " [" + n.getTipo() + "]"));

        result.setErrores(errores);
        result.setRecorrido(recorrido);
        result.setValido(errores.isEmpty());
        return result;
    }

    /**
     * Cuando el XML viene del diseñador bpmn.js, ajusta el process id
     * para que coincida con la clave sanitizada que usamos en Camunda.
     */
    private String normalizeBpmnXmlForCamunda(Workflow workflow) {
        String xml = workflow.getBpmnXml();
        String expectedKey = bpmnXmlGenerator.sanitizeKey(workflow.getId());
        // Reemplazar el id del proceso con la clave esperada por Camunda
        return xml.replaceFirst(
                "(<process[^>]*\\sid=\")[^\"]*\"",
                "$1" + expectedKey + "\""
        ).replaceFirst(
                "(<bpmndi:BPMNPlane[^>]*\\sbpmnElement=\")[^\"]*\"",
                "$1" + expectedKey + "\""
        );
    }

    WorkflowDTO toDTO(Workflow w) {
        WorkflowDTO dto = new WorkflowDTO();
        dto.setId(w.getId());
        dto.setNombre(w.getNombre());
        dto.setTipoSolicitud(w.getTipoSolicitud());
        dto.setVersion(w.getVersion());
        dto.setEstado(w.getEstado());
        dto.setFormularioId(w.getFormularioId());
        dto.setCreatedBy(w.getCreatedBy());
        dto.setCreatedAt(w.getCreatedAt());
        dto.setBpmnXml(w.getBpmnXml());
        dto.setCamundaProcessDefinitionKey(w.getCamundaProcessDefinitionKey());

        dto.setNodos(w.getNodos().stream().map(n -> {
            WorkflowNodeDTO nd = new WorkflowNodeDTO();
            nd.setId(n.getId());
            nd.setNombre(n.getNombre());
            nd.setTipo(n.getTipo());
            nd.setDepartamentoId(n.getDepartamentoId());
            nd.setRolRequerido(n.getRolRequerido());
            nd.setOrden(n.getOrden());
            nd.setRequiereEvidencia(n.isRequiereEvidencia());
            nd.setTiempoLimiteHoras(n.getTiempoLimiteHoras());
            return nd;
        }).toList());

        dto.setConexiones(w.getConexiones().stream().map(e -> {
            WorkflowEdgeDTO ed = new WorkflowEdgeDTO();
            ed.setId(e.getId());
            ed.setNodoOrigenId(e.getNodoOrigenId());
            ed.setNodoDestinoId(e.getNodoDestinoId());
            ed.setCondicion(e.getCondicion());
            ed.setEtiqueta(e.getEtiqueta());
            return ed;
        }).toList());

        return dto;
    }
}
