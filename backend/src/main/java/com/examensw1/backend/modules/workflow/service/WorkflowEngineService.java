package com.examensw1.backend.modules.workflow.service;

import com.examensw1.backend.modules.workflow.domain.*;
import com.examensw1.backend.modules.workflow.dto.*;

import com.examensw1.backend.modules.notification.service.NotificationService;
import com.examensw1.backend.modules.workflow.repository.ProcesoInstanciaRepository;
import com.examensw1.backend.modules.workflow.repository.WorkflowRepository;
import com.examensw1.backend.shared.enums.NodeType;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkflowEngineService {

    private final WorkflowRepository workflowRepository;
    private final ProcesoInstanciaRepository procesoInstanciaRepository;
    private final NotificationService notificationService;

    public ProcesoInstanciaDTO iniciarProceso(IniciarProcesoRequest request, String usuarioId) {
        Workflow template = workflowRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template", request.getTemplateId()));

        if (!"ACTIVO".equals(template.getEstado())) {
            throw new BusinessException("El template no está activo");
        }

        WorkflowNode nodoInicio = template.getNodos().stream()
                .filter(n -> NodeType.INICIO.equals(n.getTipo()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("El template no tiene nodo de inicio"));

        ProcesoInstancia instancia = new ProcesoInstancia();
        instancia.setCodigo(generarCodigo());
        instancia.setTemplateId(request.getTemplateId());
        instancia.setClienteId(request.getClienteId());
        instancia.setEstadoActual("EN_PROCESO");
        instancia.setPrioridad(request.getPrioridad());
        instancia.setNodoActual(nodoInicio);
        instancia.setResponsableActualId(usuarioId);
        instancia.setDatosFormulario(request.getDatosFormulario());

        registrarHistorial(instancia, nodoInicio, usuarioId, "INICIO", "Proceso iniciado");

        return toDTO(procesoInstanciaRepository.save(instancia));
    }

    public ProcesoInstanciaDTO avanzarNodo(String instanciaId, String usuarioId, String observacion) {
        ProcesoInstancia instancia = procesoInstanciaRepository.findById(instanciaId)
                .orElseThrow(() -> new ResourceNotFoundException("Instancia", instanciaId));

        if ("COMPLETADO".equals(instancia.getEstadoActual()) || "RECHAZADO".equals(instancia.getEstadoActual())) {
            throw new BusinessException("El trámite ya está finalizado");
        }

        Workflow template = workflowRepository.findById(instancia.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template", instancia.getTemplateId()));

        String nodoActualId = instancia.getNodoActual().getId();
        WorkflowEdge conexion = template.getConexiones().stream()
                .filter(e -> e.getNodoOrigenId().equals(nodoActualId))
                .findFirst()
                .orElse(null);

        if (conexion == null) {
            instancia.setEstadoActual("COMPLETADO");
            instancia.setFinishedAt(LocalDateTime.now());
            registrarHistorial(instancia, instancia.getNodoActual(), usuarioId, "FIN", "Trámite completado");
        } else {
            WorkflowNode siguienteNodo = template.getNodos().stream()
                    .filter(n -> n.getId().equals(conexion.getNodoDestinoId()))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("Nodo destino no encontrado"));

            registrarHistorial(instancia, instancia.getNodoActual(), usuarioId, "AVANCE", observacion);
            instancia.setNodoActual(siguienteNodo);
            instancia.setResponsableActualId(null);
            instancia.setEstadoActual(NodeType.FIN.equals(siguienteNodo.getTipo()) ? "COMPLETADO" : "EN_PROCESO");

            if ("COMPLETADO".equals(instancia.getEstadoActual())) {
                instancia.setFinishedAt(LocalDateTime.now());
            }
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

    public ProcesoInstanciaDTO rechazarNodo(String instanciaId, String usuarioId, String motivo) {
        ProcesoInstancia instancia = procesoInstanciaRepository.findById(instanciaId)
                .orElseThrow(() -> new ResourceNotFoundException("Instancia", instanciaId));

        instancia.setEstadoActual("RECHAZADO");
        instancia.setFinishedAt(LocalDateTime.now());
        instancia.setUpdatedAt(LocalDateTime.now());
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

    public List<ProcesoInstanciaDTO> listarInstancias() {
        return procesoInstanciaRepository.findAll().stream().map(this::toDTO).toList();
    }

    public ProcesoInstanciaDTO obtenerInstancia(String id) {
        return toDTO(procesoInstanciaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Instancia", id)));
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
