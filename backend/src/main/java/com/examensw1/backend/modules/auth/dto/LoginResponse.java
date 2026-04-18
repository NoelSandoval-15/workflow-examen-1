package com.examensw1.backend.modules.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String username;
    private String rolId;
    private String departamentoId;
    private String nombre;
}
