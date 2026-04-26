package com.examensw1.backend.websocket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowEventDTO {
    /** JOIN | LEAVE | BPMN_XML_CHANGED | SAVE | PRESENCE */
    private String type;
    private String workflowId;
    private String clientId;    // UUID de sesión generado en frontend
    private String username;
    private Long   version;
    private String bpmnXml;     // solo en BPMN_XML_CHANGED
    private LocalDateTime timestamp;
}
