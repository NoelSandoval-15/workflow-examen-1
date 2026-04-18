package com.examensw1.backend.modules.auth.service;

import com.examensw1.backend.modules.auth.dto.LoginRequest;
import com.examensw1.backend.modules.auth.dto.LoginResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request);
}
