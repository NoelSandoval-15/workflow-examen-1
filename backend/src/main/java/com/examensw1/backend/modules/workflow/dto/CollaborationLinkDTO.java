package com.examensw1.backend.modules.workflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CollaborationLinkDTO {
    private String templateId;
    private String templateNombre;
    private String collaborationToken;
    private String collaborationUrl;   // URL completa lista para copiar
    private Boolean collaborationEnabled;
}
