package com.examensw1.backend.modules.task.service;

import com.examensw1.backend.modules.task.domain.CampoFormulario;
import com.examensw1.backend.modules.task.domain.Task;
import com.examensw1.backend.modules.task.dto.CreateTaskRequest;
import com.examensw1.backend.modules.task.dto.TaskDTO;
import com.examensw1.backend.modules.task.dto.UpdateTaskRequest;
import com.examensw1.backend.modules.task.repository.TaskRepository;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;

    @Override
    public TaskDTO crearTarea(CreateTaskRequest request) {
        Task task = new Task();
        task.setProcesoInstanciaId(request.getProcesoInstanciaId());
        task.setNodoId(request.getNodoId());
        task.setNombre(request.getNombre());
        task.setTipo(request.getTipo());
        task.setDepartamentoAsignadoId(request.getDepartamentoAsignadoId());
        task.setUsuarioAsignadoId(request.getUsuarioAsignadoId());
        task.setRequiereEvidencia(request.isRequiereEvidencia());
        task.setFormularioDinamicoHabilitado(request.isFormularioDinamicoHabilitado());
        task.setFechaInicio(LocalDateTime.now());
        task.setFechaLimite(request.getFechaLimite());
        return toDTO(taskRepository.save(task));
    }

    @Override
    public TaskDTO obtenerTarea(String id) {
        return toDTO(taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tarea", id)));
    }

    @Override
    public List<TaskDTO> listarPorInstancia(String procesoInstanciaId) {
        return taskRepository.findByProcesoInstanciaId(procesoInstanciaId)
                .stream().map(this::toDTO).toList();
    }

    @Override
    public List<TaskDTO> listarPorUsuarioYDepartamento(String usuarioId, String departamentoId) {
        List<Task> tareas = new ArrayList<>();
        
        // Tareas explícitamente asignadas al usuario
        if (usuarioId != null) {
            tareas.addAll(taskRepository.findByUsuarioAsignadoId(usuarioId));
        }
        
        // Tareas asignadas a su departamento pero que no tienen usuario asignado
        if (departamentoId != null && !departamentoId.isBlank()) {
            List<Task> delDepto = taskRepository.findByDepartamentoAsignadoId(departamentoId).stream()
                    .filter(t -> t.getUsuarioAsignadoId() == null || t.getUsuarioAsignadoId().isBlank())
                    .toList();
            tareas.addAll(delDepto);
        }
        
        return tareas.stream().map(this::toDTO).toList();
    }

    @Override
    public TaskDTO actualizarTarea(String id, UpdateTaskRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tarea", id));
        if (request.getEstado() != null) task.setEstado(request.getEstado());
        if (request.getObservacion() != null) task.setObservacion(request.getObservacion());
        if (request.getUsuarioAsignadoId() != null) task.setUsuarioAsignadoId(request.getUsuarioAsignadoId());
        return toDTO(taskRepository.save(task));
    }

    @Override
    public TaskDTO completarTarea(String id, String observacion) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tarea", id));
        if ("COMPLETADO".equals(task.getEstado())) {
            throw new BusinessException("La tarea ya está completada");
        }
        task.setEstado("COMPLETADO");
        task.setObservacion(observacion);
        task.setFechaCompletado(LocalDateTime.now());
        return toDTO(taskRepository.save(task));
    }

    @Override
    public TaskDTO guardarFormulario(String tareaId, List<CampoFormulario> campos) {
        Task task = taskRepository.findById(tareaId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarea", tareaId));
        task.setDatosFormulario(campos);
        return toDTO(taskRepository.save(task));
    }

    @Override
    public TaskDTO reclamarTarea(String id, String usuarioId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tarea", id));
        if (task.getUsuarioAsignadoId() != null && !task.getUsuarioAsignadoId().isBlank()) {
            throw new BusinessException("La tarea ya ha sido tomada por otro funcionario");
        }
        task.setUsuarioAsignadoId(usuarioId);
        task.setEstado("EN_PROGRESO");
        return toDTO(taskRepository.save(task));
    }

    private TaskDTO toDTO(Task t) {
        TaskDTO dto = new TaskDTO();
        dto.setId(t.getId());
        dto.setProcesoInstanciaId(t.getProcesoInstanciaId());
        dto.setProcesoInstanciaCodigo(t.getProcesoInstanciaCodigo());
        dto.setNodoId(t.getNodoId());
        dto.setNombre(t.getNombre());
        dto.setTipo(t.getTipo());
        dto.setEstado(t.getEstado());
        dto.setDepartamentoAsignadoId(t.getDepartamentoAsignadoId());
        dto.setUsuarioAsignadoId(t.getUsuarioAsignadoId());
        dto.setRequiereEvidencia(t.isRequiereEvidencia());
        dto.setObservacion(t.getObservacion());
        dto.setFormularioDinamicoHabilitado(t.isFormularioDinamicoHabilitado());
        dto.setFormatosPermitidos(t.getFormatosPermitidos() != null ? t.getFormatosPermitidos() : new java.util.ArrayList<>());
        dto.setPermisoDefectoCreador(t.getPermisoDefectoCreador());
        dto.setDatosFormulario(t.getDatosFormulario());
        dto.setFechaInicio(t.getFechaInicio());
        dto.setFechaLimite(t.getFechaLimite());
        dto.setFechaCompletado(t.getFechaCompletado());
        dto.setCreatedAt(t.getCreatedAt());
        return dto;
    }
}
