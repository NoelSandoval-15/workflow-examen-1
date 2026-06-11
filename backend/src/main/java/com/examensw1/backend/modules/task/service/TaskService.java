package com.examensw1.backend.modules.task.service;

import com.examensw1.backend.modules.task.domain.CampoFormulario;
import com.examensw1.backend.modules.task.dto.CreateTaskRequest;
import com.examensw1.backend.modules.task.dto.TaskDTO;
import com.examensw1.backend.modules.task.dto.UpdateTaskRequest;

import java.util.List;

public interface TaskService {
    TaskDTO crearTarea(CreateTaskRequest request);
    TaskDTO obtenerTarea(String id);
    List<TaskDTO> listarPorInstancia(String procesoInstanciaId);
    List<TaskDTO> listarPorUsuarioYDepartamento(String usuarioId, String departamentoId);
    TaskDTO actualizarTarea(String id, UpdateTaskRequest request);
    TaskDTO completarTarea(String id, String observacion);

    /** Guarda los campos del formulario dinámico llenados por el funcionario */
    TaskDTO guardarFormulario(String tareaId, List<CampoFormulario> campos);

    /** Reclama una tarea del pool del departamento asignándosela a un usuario */
    TaskDTO reclamarTarea(String id, String usuarioId);
}
