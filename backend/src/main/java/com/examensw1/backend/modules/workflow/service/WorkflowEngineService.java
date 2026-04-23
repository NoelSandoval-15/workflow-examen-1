package com.examensw1.backend.modules.workflow.service;

import com.examensw1.backend.modules.notification.service.NotificationService;
import com.examensw1.backend.modules.workflow.domain.HistorialEntry;
import com.examensw1.backend.modules.workflow.domain.ProcesoInstancia;
import com.examensw1.backend.modules.workflow.domain.Workflow;
import com.examensw1.backend.modules.workflow.domain.WorkflowNode;
import com.examensw1.backend.modules.workflow.dto.*;
import com.examensw1.backend.modules.workflow.repository.ProcesoInstanciaRepository;
import com.examensw1.backend.modules.workflow.repository.WorkflowRepository;
import com.examensw1.backend.shared.enums.NodeType;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.camunda.bpm.engine.RuntimeService;
import org.camunda.bpm.engine.TaskService;
import org.camunda.bpm.engine.runtime.ProcessInstance;
import org.camunda.bpm.engine.task.Task;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowEngineService {

    private final WorkflowRepository workflowRepository;
    private final ProcesoInstanciaRepository procesoInstanciaRepository;
    private final NotificationService notificationService;
    private final RuntimeService runtimeService;
    private final TaskService taskService;

    // ───────────────────────────────────────────────────────────────
    // INICIAR PROCESO
    // ───────────────────────────────────────────────────────────────

    public ProcesoInstanciaDTO iniciarProceso(IniciarProcesoRequest request, String usuarioId) {
        Workflow template = workflowRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template", request.getTemplateId()));

        if (!"ACTIVO".equals(template.getEstado())) {
            throw new BusinessException("El template no está activo. Actívalo antes de iniciar un trámite.");
        }

        if (template.getCamundaProcessDefinitionKey() == null) {
            throw new BusinessException("El template no está desplegado en el motor. Activa el template primero.");
        }

        WorkflowNode nodoInicio = template.getNodos().stream()
                .filter(n -> NodeType.INICIO.equals(n.getTipo()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("El template no tiene nodo de INICIO"));

        // Variables iniciales para el proceso Camunda
        Map<String, Object> variables = new HashMap<>();
        variables.put("usuarioId", usuarioId);
        variables.put("clienteId", request.getClienteId());
        variables.put("prioridad", request.getPrioridad());
        variables.put("condicion", "");
        if (request.getDatosFormulario() != null) {
            request.getDatosFormulario().forEach((k, v) -> variables.put("form_" + k, v));
        }

        // Iniciar instancia en Camunda
        ProcessInstance camundaInstance;
        try {
            camundaInstance = runtimeService.startProcessInstanceByKey(
                    template.getCamundaProcessDefinitionKey(),
                    variables
            );
        } catch (Exception e) {
            log.error("Error al iniciar proceso en Camunda: {}", e.getMessage(), e);
            throw new BusinessException("Error al iniciar el proceso en el motor: " + e.getMessage());
        }

        // Crear proyección en MongoDB
        ProcesoInstancia instancia = new ProcesoInstancia();
        instancia.setCodigo(generarCodigo());
        instancia.setTemplateId(request.getTemplateId());
        instancia.setClienteId(request.getClienteId());
        instancia.setEstadoActual("EN_PROCESO");
        instancia.setPrioridad(request.getPrioridad() != null ? request.getPrioridad() : "NORMAL");
        instancia.setNodoActual(nodoInicio);
        instancia.setResponsableActualId(usuarioId);
        instancia.setDatosFormulario(request.getDatosFormulario());
        instancia.setCamundaProcessInstanceId(camundaInstance.getId());

        registrarHistorial(instancia, nodoInicio, usuarioId, "INICIO", "Proceso iniciado");

        // Sincronizar tarea activa de Camunda
        sincronizarTareaActiva(instancia, camundaInstance.getId());

        ProcesoInstanciaDTO dto = toDTO(procesoInstanciaRepository.save(instancia));
        log.info("Proceso iniciado: codigo={}, camundaId={}", instancia.getCodigo(), camundaInstance.getId());
        return dto;
    }

    // ───────────────────────────────────────────────────────────────
    // AVANZAR NODO (completar tarea activa)
    // ───────────────────────────────────────────────────────────────

    public ProcesoInstanciaDTO avanzarNodo(String instanciaId, String usuarioId,
                                            String observacion, String condicion) {
        ProcesoInstancia instancia = procesoInstanciaRepository.findById(instanciaId)
                .orElseThrow(() -> new ResourceNotFoundException("Instancia", instanciaId));

        if ("COMPLETADO".equals(instancia.getEstadoActual()) || "RECHAZADO".equals(instancia.getEstadoActual())) {
            throw new BusinessException("El trámite ya está finalizado");
        }

        if (instancia.getCamundaProcessInstanceId() == null) {
            // Fallback: avance artesanal para instancias sin Camunda
            return avanzarNodoLegacy(instancia, usuarioId, observacion, condicion);
        }

        String camundaProcId = instancia.getCamundaProcessInstanceId();

        // Obtener tarea activa en Camunda
        Task task = taskService.createTaskQuery()
                .processInstanceId(camundaProcId)
                .singleResult();

        if (task == null) {
            // El proceso terminó en Camunda pero MongoDB no estaba sincronizado
            instancia.setEstadoActual("COMPLETADO");
            instancia.setFinishedAt(LocalDateTime.now());
            instancia.setUpdatedAt(LocalDateTime.now());
            return toDTO(procesoInstanciaRepository.save(instancia));
        }

        // Variables para ruteo en gateways exclusivos
        Map<String, Object> taskVars = new HashMap<>();
        taskVars.put("condicion", condicion != null ? condicion : "");
        taskVars.put("usuarioId", usuarioId);
        taskVars.put("observacion", observacion != null ? observacion : "");

        // Completar tarea en Camunda
        try {
            taskService.complete(task.getId(), taskVars);
        } catch (Exception e) {
            log.error("Error al completar tarea en Camunda: {}", e.getMessage(), e);
            throw new BusinessException("Error al avanzar en el motor: " + e.getMessage());
        }

        // Registrar en historial MongoDB
        registrarHistorial(instancia, instancia.getNodoActual(), usuarioId, "AVANCE",
                (condicion != null && !condicion.isBlank() ? "[" + condicion + "] " : "") +
                (observacion != null ? observacion : ""));

        // Determinar si el proceso terminó en Camunda
        boolean procesoActivo = runtimeService.createProcessInstanceQuery()
                .processInstanceId(camundaProcId)
                .count() > 0;

        if (!procesoActivo) {
            // Proceso completado en Camunda → sincronizar MongoDB
            instancia.setEstadoActual("COMPLETADO");
            instancia.setFinishedAt(LocalDateTime.now());
            instancia.setCamundaTaskId(null);
            // Avanzar nodoActual al nodo FIN
            actualizarNodoActualAlFin(instancia);
        } else {
            // Sincronizar nueva tarea activa
            sincronizarTareaActiva(instancia, camundaProcId);
        }

        instancia.setUpdatedAt(LocalDateTime.now());
        ProcesoInstanciaDTO resultado = toDTO(procesoInstanciaRepository.save(instancia));

        notificationService.enviarNotificacion(
                usuarioId,
                "Trámite avanzado",
                "El trámite " + instancia.getCodigo() + " avanzó al nodo: " + instancia.getNodoActual().getNombre(),
                "WORKFLOW_AVANCE",
                instanciaId
        );

        return resultado;
    }

    // ───────────────────────────────────────────────────────────────
    // RECHAZAR
    // ───────────────────────────────────────────────────────────────

    public ProcesoInstanciaDTO rechazarNodo(String instanciaId, String usuarioId, String motivo) {
        ProcesoInstancia instancia = procesoInstanciaRepository.findById(instanciaId)
                .orElseThrow(() -> new ResourceNotFoundException("Instancia", instanciaId));

        // Cancelar el proceso en Camunda si existe
        if (instancia.getCamundaProcessInstanceId() != null) {
            try {
                boolean activo = runtimeService.createProcessInstanceQuery()
                        .processInstanceId(instancia.getCamundaProcessInstanceId())
                        .count() > 0;
                if (activo) {
                    runtimeService.deleteProcessInstance(
                            instancia.getCamundaProcessInstanceId(),
                            "RECHAZADO: " + motivo
                    );
                }
            } catch (Exception e) {
                log.warn("No se pudo cancelar instancia Camunda {}: {}", instancia.getCamundaProcessInstanceId(), e.getMessage());
            }
        }

        instancia.setEstadoActual("RECHAZADO");
        instancia.setFinishedAt(LocalDateTime.now());
        instancia.setUpdatedAt(LocalDateTime.now());
        instancia.setCamundaTaskId(null);
        registrarHistorial(instancia, instancia.getNodoActual(), usuarioId, "RECHAZO", motivo);

        ProcesoInstanciaDTO resultado = toDTO(procesoInstanciaRepository.save(instancia));

        notificationService.enviarNotificacion(
                usuarioId,
                "Trámite rechazado",
                "El trámite " + instancia.getCodigo() + " fue rechazado. Motivo: " + motivo,
                "WORKFLOW_RECHAZO",
                instanciaId
        );

        return resultado;
    }

    // ───────────────────────────────────────────────────────────────
    // CONSULTAS
    // ───────────────────────────────────────────────────────────────

    public List<ProcesoInstanciaDTO> listarInstancias() {
        return procesoInstanciaRepository.findAll().stream().map(this::toDTO).toList();
    }

    public ProcesoInstanciaDTO obtenerInstancia(String id) {
        ProcesoInstancia instancia = procesoInstanciaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Instancia", id));

        // Sincronizar estado con Camunda si el proceso sigue activo
        if (instancia.getCamundaProcessInstanceId() != null
                && "EN_PROCESO".equals(instancia.getEstadoActual())) {
            sincronizarTareaActiva(instancia, instancia.getCamundaProcessInstanceId());
            procesoInstanciaRepository.save(instancia);
        }

        return toDTO(instancia);
    }

    // ───────────────────────────────────────────────────────────────
    // HELPERS PRIVADOS
    // ───────────────────────────────────────────────────────────────

    private void sincronizarTareaActiva(ProcesoInstancia instancia, String camundaProcId) {
        Task task = taskService.createTaskQuery()
                .processInstanceId(camundaProcId)
                .singleResult();
        if (task != null) {
            instancia.setCamundaTaskId(task.getId());

            // Intentar mapear el nodo actual por nombre de tarea
            Workflow template = workflowRepository.findById(instancia.getTemplateId()).orElse(null);
            if (template != null) {
                template.getNodos().stream()
                        .filter(n -> n.getNombre().equals(task.getName()) || n.getId().equals(task.getTaskDefinitionKey()))
                        .findFirst()
                        .ifPresent(instancia::setNodoActual);
            }
        } else {
            instancia.setCamundaTaskId(null);
        }
    }

    private void actualizarNodoActualAlFin(ProcesoInstancia instancia) {
        Workflow template = workflowRepository.findById(instancia.getTemplateId()).orElse(null);
        if (template != null) {
            template.getNodos().stream()
                    .filter(n -> NodeType.FIN.equals(n.getTipo()))
                    .findFirst()
                    .ifPresent(instancia::setNodoActual);
        }
    }

    /** Fallback para instancias creadas antes de la integración con Camunda */
    private ProcesoInstanciaDTO avanzarNodoLegacy(ProcesoInstancia instancia, String usuarioId,
                                                    String observacion, String condicion) {
        Workflow template = workflowRepository.findById(instancia.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template", instancia.getTemplateId()));

        String nodoActualId = instancia.getNodoActual().getId();
        var conexion = template.getConexiones().stream()
                .filter(e -> e.getNodoOrigenId().equals(nodoActualId))
                .filter(e -> condicion == null || condicion.isBlank() || condicion.equals(e.getCondicion()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("No existe conexión desde el nodo actual"));

        WorkflowNode siguiente = template.getNodos().stream()
                .filter(n -> n.getId().equals(conexion.getNodoDestinoId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Nodo destino no encontrado"));

        registrarHistorial(instancia, instancia.getNodoActual(), usuarioId, "AVANCE",
                (condicion != null && !condicion.isBlank() ? "[" + condicion + "] " : "") + observacion);

        instancia.setNodoActual(siguiente);
        instancia.setResponsableActualId(null);
        instancia.setEstadoActual(NodeType.FIN.equals(siguiente.getTipo()) ? "COMPLETADO" : "EN_PROCESO");

        if ("COMPLETADO".equals(instancia.getEstadoActual())) {
            instancia.setFinishedAt(LocalDateTime.now());
        }
        instancia.setUpdatedAt(LocalDateTime.now());

        return toDTO(procesoInstanciaRepository.save(instancia));
    }

    private void registrarHistorial(ProcesoInstancia instancia, WorkflowNode nodo,
                                     String usuarioId, String accion, String observacion) {
        HistorialEntry entry = new HistorialEntry();
        entry.setNodoId(nodo.getId());
        entry.setNodoNombre(nodo.getNombre());
        entry.setUsuarioId(usuarioId);
        entry.setAccion(accion);
        entry.setObservacion(observacion);
        entry.setFecha(LocalDateTime.now());
        instancia.getHistorialResumen().add(entry);
    }

    private String generarCodigo() {
        return "TRM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private ProcesoInstanciaDTO toDTO(ProcesoInstancia p) {
        ProcesoInstanciaDTO dto = new ProcesoInstanciaDTO();
        dto.setId(p.getId());
        dto.setCodigo(p.getCodigo());
        dto.setTemplateId(p.getTemplateId());
        dto.setClienteId(p.getClienteId());
        dto.setEstadoActual(p.getEstadoActual());
        dto.setPrioridad(p.getPrioridad());
        dto.setResponsableActualId(p.getResponsableActualId());
        dto.setDatosFormulario(p.getDatosFormulario());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());
        dto.setFinishedAt(p.getFinishedAt());
        dto.setCamundaProcessInstanceId(p.getCamundaProcessInstanceId());
        dto.setCamundaTaskId(p.getCamundaTaskId());

        if (p.getNodoActual() != null) {
            WorkflowNodeDTO nd = new WorkflowNodeDTO();
            nd.setId(p.getNodoActual().getId());
            nd.setNombre(p.getNodoActual().getNombre());
            nd.setTipo(p.getNodoActual().getTipo());
            nd.setDepartamentoId(p.getNodoActual().getDepartamentoId());
            dto.setNodoActual(nd);
        }

        if (p.getHistorialResumen() != null) {
            dto.setHistorialResumen(p.getHistorialResumen().stream().map(h -> {
                HistorialEntryDTO hd = new HistorialEntryDTO();
                hd.setNodoId(h.getNodoId());
                hd.setNodoNombre(h.getNodoNombre());
                hd.setUsuarioId(h.getUsuarioId());
                hd.setAccion(h.getAccion());
                hd.setObservacion(h.getObservacion());
                hd.setFecha(h.getFecha());
                return hd;
            }).toList());
        }

        return dto;
    }
}
