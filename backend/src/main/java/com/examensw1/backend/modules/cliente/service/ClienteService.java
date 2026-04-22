package com.examensw1.backend.modules.cliente.service;

import com.examensw1.backend.modules.cliente.dto.ClienteDTO;
import com.examensw1.backend.modules.cliente.dto.CreateClienteRequest;

import java.util.List;

public interface ClienteService {
    ClienteDTO crear(CreateClienteRequest request);
    List<ClienteDTO> listar();
    ClienteDTO obtener(String id);
    ClienteDTO actualizar(String id, CreateClienteRequest request);
    void desactivar(String id);
}
