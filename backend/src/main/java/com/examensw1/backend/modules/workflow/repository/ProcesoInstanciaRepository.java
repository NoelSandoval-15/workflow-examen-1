package com.examensw1.backend.modules.workflow.repository;

import com.examensw1.backend.modules.workflow.domain.ProcesoInstancia;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ProcesoInstanciaRepository extends MongoRepository<ProcesoInstancia, String> {
    List<ProcesoInstancia> findByEstadoActual(String estadoActual);
    List<ProcesoInstancia> findByClienteId(String clienteId);
    List<ProcesoInstancia> findByTemplateId(String templateId);
    Optional<ProcesoInstancia> findByCodigo(String codigo);
}
