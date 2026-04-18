package com.examensw1.backend.modules.user.repository;

import com.examensw1.backend.modules.user.domain.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByCorreo(String correo);
}
