package com.examensw1.backend.modules.workflow.domain;

import com.examensw1.backend.shared.enums.NodeType;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class WorkflowNode {
    private String id;
    private String nombre;
    private NodeType tipo;
    private String departamentoId;
    private String rolRequerido;
    private String formularioId;
    private String funcionarioId;    // usuario asignado a este nodo
    private boolean requiereEvidencia;
    private String fechaLimite;
    private int orden;

    /** Habilita el form builder dinámico para que el funcionario llene datos en este nodo */
    private boolean formularioDinamicoHabilitado;

    // Nuevos campos para Configuración y Permisos de Documentos
    private List<String> formatosPermitidos;
    private String permisoDefectoCreador;
    private String nivelVisibilidadGlobal;
    private boolean bloquearAlCompletar;
    private boolean habilitarFirmaDigital;
    private List<ReglaPermisoDocumento> matrizPermisosDocumentos;
}
