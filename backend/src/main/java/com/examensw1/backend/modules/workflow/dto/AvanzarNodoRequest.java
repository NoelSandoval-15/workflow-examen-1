package com.examensw1.backend.modules.workflow.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AvanzarNodoRequest {
    private String observacion = "";
    private String condicion;
}
