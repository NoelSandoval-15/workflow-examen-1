package com.examensw1.backend.modules.user.service;

import com.examensw1.backend.modules.user.domain.User;
import com.examensw1.backend.modules.user.dto.CreateUserRequest;
import com.examensw1.backend.modules.user.dto.UpdateUserRequest;
import com.examensw1.backend.modules.user.dto.UserDTO;
import com.examensw1.backend.modules.user.repository.UserRepository;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserDTO crearUsuario(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException("El username ya está en uso");
        }
        if (userRepository.existsByCorreo(request.getCorreo())) {
            throw new BusinessException("El correo ya está registrado");
        }
        User user = new User();
        user.setNombre(request.getNombre());
        user.setApellido(request.getApellido());
        user.setCorreo(request.getCorreo());
        user.setTelefono(request.getTelefono());
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRolId(request.getRolId());
        user.setDepartamentoId(request.getDepartamentoId());
        return toDTO(userRepository.save(user));
    }

    @Override
    public List<UserDTO> listarUsuarios() {
        return userRepository.findAll().stream().map(this::toDTO).toList();
    }

    @Override
    public UserDTO obtenerUsuario(String id) {
        return toDTO(userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id)));
    }

    @Override
    public UserDTO actualizarUsuario(String id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
        if (request.getNombre() != null) user.setNombre(request.getNombre());
        if (request.getApellido() != null) user.setApellido(request.getApellido());
        if (request.getCorreo() != null) user.setCorreo(request.getCorreo());
        if (request.getTelefono() != null) user.setTelefono(request.getTelefono());
        if (request.getRolId() != null) user.setRolId(request.getRolId());
        if (request.getDepartamentoId() != null) user.setDepartamentoId(request.getDepartamentoId());
        return toDTO(userRepository.save(user));
    }

    @Override
    public void desactivarUsuario(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
        user.setActivo(false);
        userRepository.save(user);
    }

    private UserDTO toDTO(User u) {
        UserDTO dto = new UserDTO();
        dto.setId(u.getId());
        dto.setNombre(u.getNombre());
        dto.setApellido(u.getApellido());
        dto.setCorreo(u.getCorreo());
        dto.setTelefono(u.getTelefono());
        dto.setUsername(u.getUsername());
        dto.setRolId(u.getRolId());
        dto.setDepartamentoId(u.getDepartamentoId());
        dto.setActivo(u.isActivo());
        dto.setUltimoAcceso(u.getUltimoAcceso());
        dto.setCreatedAt(u.getCreatedAt());
        return dto;
    }
}
