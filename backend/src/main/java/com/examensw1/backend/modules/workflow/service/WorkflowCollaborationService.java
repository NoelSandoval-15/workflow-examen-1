package com.examensw1.backend.modules.workflow.service;

import com.examensw1.backend.modules.workflow.dto.CollaborationLinkDTO;
import com.examensw1.backend.modules.workflow.dto.CollaborationSessionDTO;

public interface WorkflowCollaborationService {
    CollaborationLinkDTO generarLink(String templateId, String frontendBaseUrl);
    CollaborationLinkDTO regenerarLink(String templateId, String frontendBaseUrl);
    void revocarLink(String templateId);
    CollaborationSessionDTO resolverToken(String token);
}
