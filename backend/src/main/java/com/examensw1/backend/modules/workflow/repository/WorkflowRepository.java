package com.examensw1.backend.modules.workflow.repository;

import com.examensw1.backend.modules.workflow.domain.Workflow;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface WorkflowRepository extends MongoRepository<Workflow, String> {
    List<Workflow> findByEstado(String estado);
    Optional<Workflow> findByNombre(String nombre);
    boolean existsByNombreAndEstado(String nombre, String estado);
}
