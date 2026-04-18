package com.examensw1.backend.modules.workflow.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class SimulationResultDTO {
    private String templateId;
    private String templateNombre;
    private boolean valido;
    private List<String> errores;
    private List<String> recorrido;
    private int totalNodos;
}
