package com.examensw1.backend.modules.cliente.repository;

import com.examensw1.backend.modules.cliente.domain.Cliente;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ClienteRepository extends MongoRepository<Cliente, String> {
    boolean existsByCorreo(String correo);
}
