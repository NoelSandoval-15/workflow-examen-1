package com.examensw1.backend.modules.user.service;

import com.examensw1.backend.modules.user.dto.CreateUserRequest;
import com.examensw1.backend.modules.user.dto.UpdateUserRequest;
import com.examensw1.backend.modules.user.dto.UserDTO;

import java.util.List;

public interface UserService {
    UserDTO crearUsuario(CreateUserRequest request);
    List<UserDTO> listarUsuarios();
    UserDTO obtenerUsuario(String id);
    UserDTO actualizarUsuario(String id, UpdateUserRequest request);
    void desactivarUsuario(String id);
}
