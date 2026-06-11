package com.examensw1.backend.modules.task.dto;

import com.examensw1.backend.modules.task.domain.CampoFormulario;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Request para guardar los campos del formulario dinámico
 * llenados por el funcionario en su tarea.
 */
@Getter
@Setter
public class GuardarFormularioRequest {
    private List<CampoFormulario> campos = new ArrayList<>();
}
