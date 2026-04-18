package com.examensw1.backend.modules.auth.service;

import com.examensw1.backend.modules.auth.dto.LoginRequest;
import com.examensw1.backend.modules.auth.dto.LoginResponse;
import com.examensw1.backend.modules.user.domain.User;
import com.examensw1.backend.modules.user.repository.UserRepository;
import com.examensw1.backend.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @Override
    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        String token = jwtTokenProvider.generateToken(authentication);

        User user = userRepository.findByUsername(request.getUsername()).orElseThrow();
        user.setUltimoAcceso(LocalDateTime.now());
        userRepository.save(user);

        return new LoginResponse(token, user.getUsername(), user.getRolId(),
                user.getDepartamentoId(), user.getNombre());
    }
}
