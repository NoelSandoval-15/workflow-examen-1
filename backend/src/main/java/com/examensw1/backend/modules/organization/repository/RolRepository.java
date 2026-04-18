package com.examensw1.backend.modules.organization.repository;

import com.examensw1.backend.modules.organization.domain.Rol;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RolRepository extends MongoRepository<Rol, String> {
    List<Rol> findByActivoTrue();
    boolean existsByNombre(String nombre);
}
