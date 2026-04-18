package com.examensw1.backend.modules.organization.repository;

import com.examensw1.backend.modules.organization.domain.Departamento;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DepartamentoRepository extends MongoRepository<Departamento, String> {
    List<Departamento> findByActivoTrue();
    boolean existsByNombre(String nombre);
}
