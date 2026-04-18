package com.examensw1.backend.modules.organization.service;

import com.examensw1.backend.modules.organization.dto.CreateOrganizationRequest;
import com.examensw1.backend.modules.organization.dto.DepartamentoDTO;
import com.examensw1.backend.modules.organization.dto.RolDTO;

import java.util.List;

public interface OrganizationService {

    DepartamentoDTO crearDepartamento(CreateOrganizationRequest request);
    List<DepartamentoDTO> listarDepartamentos();
    DepartamentoDTO obtenerDepartamento(String id);
    void desactivarDepartamento(String id);

    RolDTO crearRol(CreateOrganizationRequest request);
    List<RolDTO> listarRoles();
    RolDTO obtenerRol(String id);
    void desactivarRol(String id);
}
