package com.examensw1.backend.modules.task.dto;

import com.examensw1.backend.modules.task.domain.CampoFormulario;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class TaskDTO {
    private String id;
    private String procesoInstanciaId;
    private String procesoInstanciaCodigo;  // TRM-XXXXXXXX para mostrar en UI
    private String nodoId;
    private String nombre;
    private String tipo;
    private String estado;
    private String departamentoAsignadoId;
    private String usuarioAsignadoId;
    private boolean requiereEvidencia;
    private String observacion;
    private boolean formularioDinamicoHabilitado;
    private List<String> formatosPermitidos = new ArrayList<>();
    private String permisoDefectoCreador;
    private List<CampoFormulario> datosFormulario = new ArrayList<>();
    private LocalDateTime fechaInicio;
    private LocalDateTime fechaLimite;
    private LocalDateTime fechaCompletado;
    private LocalDateTime createdAt;
}
