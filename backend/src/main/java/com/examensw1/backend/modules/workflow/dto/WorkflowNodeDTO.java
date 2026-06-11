package com.examensw1.backend.modules.workflow.dto;

import com.examensw1.backend.shared.enums.NodeType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import com.examensw1.backend.modules.workflow.domain.ReglaPermisoDocumento;

@Getter
@Setter
public class WorkflowNodeDTO {
    private String id;

    @NotBlank(message = "El nombre del nodo es obligatorio")
    private String nombre;

    @NotNull(message = "El tipo de nodo es obligatorio")
    private NodeType tipo;

    private String departamentoId;
    private String rolRequerido;
    private String formularioId;
    private String funcionarioId;
    private boolean requiereEvidencia;
    private String fechaLimite;
    private int orden;

    /** Indica si este nodo tiene form builder dinámico habilitado para el funcionario */
    private boolean formularioDinamicoHabilitado;

    // Nuevos campos para Configuración y Permisos de Documentos
    private List<String> formatosPermitidos;
    private String permisoDefectoCreador;
    private String nivelVisibilidadGlobal;
    private boolean bloquearAlCompletar;
    private boolean habilitarFirmaDigital;
    private List<ReglaPermisoDocumento> matrizPermisosDocumentos;
}
