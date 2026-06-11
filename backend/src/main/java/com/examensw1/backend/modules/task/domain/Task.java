package com.examensw1.backend.modules.task.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Document(collection = "tareas")
public class Task {

    @Id
    private String id;

    private String procesoInstanciaId;
    private String procesoInstanciaCodigo;
    private String nodoId;
    private String nombre;
    private String tipo;
    private String estado = "PENDIENTE";
    private String departamentoAsignadoId;
    private String usuarioAsignadoId;
    private boolean requiereEvidencia;
    private String observacion;

    /** Indica si este nodo tiene formulario dinámico habilitado */
    private boolean formularioDinamicoHabilitado;

    /** Formatos de archivo que el funcionario puede subir en este nodo (copiados del WorkflowNode) */
    private List<String> formatosPermitidos = new ArrayList<>();

    /** Permiso por defecto del creador: VER, EDITAR o NINGUNO (copiado del WorkflowNode) */
    private String permisoDefectoCreador;

    /** Campos y valores del formulario dinámico llenado por el funcionario */
    private List<CampoFormulario> datosFormulario = new ArrayList<>();

    private LocalDateTime fechaInicio;
    private LocalDateTime fechaLimite;
    private LocalDateTime fechaCompletado;

    @CreatedDate
    private LocalDateTime createdAt;
}
