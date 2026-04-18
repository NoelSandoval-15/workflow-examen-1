package com.examensw1.backend.modules.task.service;

import com.examensw1.backend.modules.task.dto.CreateTaskRequest;
import com.examensw1.backend.modules.task.dto.TaskDTO;
import com.examensw1.backend.modules.task.dto.UpdateTaskRequest;

import java.util.List;

public interface TaskService {
    TaskDTO crearTarea(CreateTaskRequest request);
    TaskDTO obtenerTarea(String id);
    List<TaskDTO> listarPorInstancia(String procesoInstanciaId);
    List<TaskDTO> listarPorUsuario(String usuarioId);
    TaskDTO actualizarTarea(String id, UpdateTaskRequest request);
    TaskDTO completarTarea(String id, String observacion);
}
