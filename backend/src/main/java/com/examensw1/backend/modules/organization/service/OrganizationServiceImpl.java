package com.examensw1.backend.modules.organization.service;

import com.examensw1.backend.modules.organization.domain.Departamento;
import com.examensw1.backend.modules.organization.domain.Rol;
import com.examensw1.backend.modules.organization.dto.CreateOrganizationRequest;
import com.examensw1.backend.modules.organization.dto.DepartamentoDTO;
import com.examensw1.backend.modules.organization.dto.RolDTO;
import com.examensw1.backend.modules.organization.repository.DepartamentoRepository;
import com.examensw1.backend.modules.organization.repository.RolRepository;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrganizationServiceImpl implements OrganizationService {

    private final DepartamentoRepository departamentoRepository;
    private final RolRepository rolRepository;

    @Override
    public DepartamentoDTO crearDepartamento(CreateOrganizationRequest request) {
        if (departamentoRepository.existsByNombre(request.getNombre())) {
            throw new BusinessException("Ya existe un departamento con ese nombre");
        }
        Departamento departamento = new Departamento();
        departamento.setNombre(request.getNombre());
        departamento.setDescripcion(request.getDescripcion());
        return toDTO(departamentoRepository.save(departamento));
    }

    @Override
    public List<DepartamentoDTO> listarDepartamentos() {
        return departamentoRepository.findByActivoTrue()
                .stream().map(this::toDTO).toList();
    }

    @Override
    public DepartamentoDTO obtenerDepartamento(String id) {
        return toDTO(departamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Departamento", id)));
    }

    @Override
    public void desactivarDepartamento(String id) {
        Departamento dep = departamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Departamento", id));
        dep.setActivo(false);
        departamentoRepository.save(dep);
    }

    @Override
    public RolDTO crearRol(CreateOrganizationRequest request) {
        if (rolRepository.existsByNombre(request.getNombre())) {
            throw new BusinessException("Ya existe un rol con ese nombre");
        }
        Rol rol = new Rol();
        rol.setNombre(request.getNombre());
        rol.setDescripcion(request.getDescripcion());
        return toDTO(rolRepository.save(rol));
    }

    @Override
    public List<RolDTO> listarRoles() {
        return rolRepository.findByActivoTrue()
                .stream().map(this::toDTO).toList();
    }

    @Override
    public RolDTO obtenerRol(String id) {
        return toDTO(rolRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", id)));
    }

    @Override
    public void desactivarRol(String id) {
        Rol rol = rolRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", id));
        rol.setActivo(false);
        rolRepository.save(rol);
    }

    private DepartamentoDTO toDTO(Departamento d) {
        DepartamentoDTO dto = new DepartamentoDTO();
        dto.setId(d.getId());
        dto.setNombre(d.getNombre());
        dto.setDescripcion(d.getDescripcion());
        dto.setActivo(d.isActivo());
        dto.setCreatedAt(d.getCreatedAt());
        return dto;
    }

    private RolDTO toDTO(Rol r) {
        RolDTO dto = new RolDTO();
        dto.setId(r.getId());
        dto.setNombre(r.getNombre());
        dto.setDescripcion(r.getDescripcion());
        dto.setActivo(r.isActivo());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}
