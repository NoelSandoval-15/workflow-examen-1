package com.examensw1.backend.config;

import com.examensw1.backend.modules.user.domain.User;
import com.examensw1.backend.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setNombre("Administrador");
            admin.setApellido("Sistema");
            admin.setCorreo("admin@cree.com");
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setRolId("ADMIN");
            admin.setDepartamentoId("SISTEMA");
            admin.setActivo(true);
            userRepository.save(admin);
            System.out.println(">>> Usuario admin creado: admin / admin123");
        }
    }
}
