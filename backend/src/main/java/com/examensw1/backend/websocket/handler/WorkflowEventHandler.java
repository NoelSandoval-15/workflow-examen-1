package com.examensw1.backend.websocket.handler;

import com.examensw1.backend.modules.workflow.domain.Workflow;
import com.examensw1.backend.modules.workflow.repository.WorkflowRepository;
import com.examensw1.backend.websocket.dto.WorkflowEventDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WorkflowEventHandler {

    private final SimpMessagingTemplate messagingTemplate;
    private final WorkflowRepository workflowRepository;

    /**
     * Recibe cambio BPMN de un cliente y lo rebroadcast a todos en la sala.
     * Cliente envía a:   /app/workflows/{workflowId}/collaboration/change
     * Todos reciben en:  /topic/workflows/{workflowId}/collaboration
     */
    @MessageMapping("/workflows/{workflowId}/collaboration/change")
    public void handleBpmnChange(
            @DestinationVariable String workflowId,
            @Payload WorkflowEventDTO event) {

        event.setWorkflowId(workflowId);
        event.setTimestamp(LocalDateTime.now());
        event.setType("BPMN_XML_CHANGED");

        // Persistir el XML en MongoDB con debounce natural del STOMP
        if (event.getBpmnXml() != null && !event.getBpmnXml().isBlank()) {
            persistirXml(workflowId, event.getBpmnXml(), event.getVersion());
        }

        // Rebroadcast a todos los suscriptores de esta sala (incluye al emisor,
        // pero el frontend filtra por clientId propio)
        messagingTemplate.convertAndSend(
                "/topic/workflows/" + workflowId + "/collaboration",
                event
        );

        log.debug("BPMN_XML_CHANGED → sala {} | cliente {} | v{}",
                workflowId, event.getClientId(), event.getVersion());
    }

    /**
     * Presencia: cliente entra o sale de la sala.
     * Cliente envía a:  /app/workflows/{workflowId}/collaboration/presence
     */
    @MessageMapping("/workflows/{workflowId}/collaboration/presence")
    public void handlePresence(
            @DestinationVariable String workflowId,
            @Payload WorkflowEventDTO event) {

        event.setWorkflowId(workflowId);
        event.setTimestamp(LocalDateTime.now());

        messagingTemplate.convertAndSend(
                "/topic/workflows/" + workflowId + "/collaboration",
                event
        );

        log.info("PRESENCE {} → sala {} | usuario {}",
                event.getType(), workflowId, event.getUsername());
    }

    // ─── Persistencia con throttle natural ───────────────────────
    private void persistirXml(String workflowId, String bpmnXml, Long version) {
        try {
            workflowRepository.findById(workflowId).ifPresent(w -> {
                // Solo actualizar si la versión es más nueva
                Long vActual = w.getCollaborationVersion() != null ? w.getCollaborationVersion() : 0L;
                Long vEvento = version != null ? version : 0L;
                if (vEvento >= vActual) {
                    w.setBpmnXml(bpmnXml);
                    w.setCollaborationVersion(vEvento);
                    w.setCollaborationUpdatedAt(LocalDateTime.now());
                    workflowRepository.save(w);
                }
            });
        } catch (Exception e) {
            log.warn("Error al persistir XML colaborativo para {}: {}", workflowId, e.getMessage());
        }
    }
}
