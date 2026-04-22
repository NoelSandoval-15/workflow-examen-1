package com.examensw1.backend.modules.cliente.service;

import com.examensw1.backend.modules.cliente.domain.Cliente;
import com.examensw1.backend.modules.cliente.dto.ClienteDTO;
import com.examensw1.backend.modules.cliente.dto.CreateClienteRequest;
import com.examensw1.backend.modules.cliente.repository.ClienteRepository;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClienteServiceImpl implements ClienteService {

    private final ClienteRepository clienteRepository;

    @Override
    public ClienteDTO crear(CreateClienteRequest request) {
        if (request.getCorreo() != null && !request.getCorreo().isBlank()
                && clienteRepository.existsByCorreo(request.getCorreo())) {
            throw new BusinessException("El correo ya está registrado");
        }
        Cliente cliente = new Cliente();
        cliente.setNombre(request.getNombre());
        cliente.setApellido(request.getApellido());
        cliente.setCorreo(request.getCorreo());
        cliente.setTelefono(request.getTelefono());
        cliente.setDireccion(request.getDireccion());
        return toDTO(clienteRepository.save(cliente));
    }

    @Override
    public List<ClienteDTO> listar() {
        return clienteRepository.findAll().stream().map(this::toDTO).toList();
    }

    @Override
    public ClienteDTO obtener(String id) {
        return toDTO(clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id)));
    }

    @Override
    public ClienteDTO actualizar(String id, CreateClienteRequest request) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
        if (request.getNombre() != null) cliente.setNombre(request.getNombre());
        if (request.getApellido() != null) cliente.setApellido(request.getApellido());
        if (request.getCorreo() != null) cliente.setCorreo(request.getCorreo());
        if (request.getTelefono() != null) cliente.setTelefono(request.getTelefono());
        if (request.getDireccion() != null) cliente.setDireccion(request.getDireccion());
        return toDTO(clienteRepository.save(cliente));
    }

    @Override
    public void desactivar(String id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
        cliente.setActivo(false);
        clienteRepository.save(cliente);
    }

    private ClienteDTO toDTO(Cliente c) {
        ClienteDTO dto = new ClienteDTO();
        dto.setId(c.getId());
        dto.setNombre(c.getNombre());
        dto.setApellido(c.getApellido());
        dto.setCorreo(c.getCorreo());
        dto.setTelefono(c.getTelefono());
        dto.setDireccion(c.getDireccion());
        dto.setActivo(c.isActivo());
        dto.setCreatedAt(c.getCreatedAt());
        return dto;
    }
}
