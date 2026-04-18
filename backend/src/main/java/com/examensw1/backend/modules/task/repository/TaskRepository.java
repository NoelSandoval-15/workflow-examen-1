package com.examensw1.backend.modules.task.repository;

import com.examensw1.backend.modules.task.domain.Task;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findByProcesoInstanciaId(String procesoInstanciaId);
    List<Task> findByUsuarioAsignadoId(String usuarioAsignadoId);
    List<Task> findByEstado(String estado);
    List<Task> findByDepartamentoAsignadoId(String departamentoAsignadoId);
}
