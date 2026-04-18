package com.examensw1.backend.modules.form.service;

import com.examensw1.backend.modules.form.domain.Form;
import com.examensw1.backend.modules.form.domain.FormField;
import com.examensw1.backend.modules.form.dto.FormDTO;
import com.examensw1.backend.modules.form.dto.FormFieldDTO;
import com.examensw1.backend.modules.form.dto.FormSubmissionDTO;
import com.examensw1.backend.modules.form.repository.FormRepository;
import com.examensw1.backend.modules.workflow.domain.ProcesoInstancia;
import com.examensw1.backend.modules.workflow.repository.ProcesoInstanciaRepository;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FormServiceImpl implements FormService {

    private final FormRepository formRepository;
    private final ProcesoInstanciaRepository procesoInstanciaRepository;

    @Override
    public FormDTO crearFormulario(FormDTO request) {
        Form form = new Form();
        form.setNombre(request.getNombre());
        form.setTipoSolicitud(request.getTipoSolicitud());
        if (request.getCampos() != null) {
            request.getCampos().forEach(f -> {
                FormField field = new FormField();
                field.setId(f.getId());
                field.setNombre(f.getNombre());
                field.setEtiqueta(f.getEtiqueta());
                field.setTipo(f.getTipo());
                field.setRequerido(f.isRequerido());
                field.setValorDefault(f.getValorDefault());
                field.setOrden(f.getOrden());
                form.getCampos().add(field);
            });
        }
        return toDTO(formRepository.save(form));
    }

    @Override
    public FormDTO obtenerFormulario(String id) {
        return toDTO(formRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formulario", id)));
    }

    @Override
    public List<FormDTO> listarFormularios() {
        return formRepository.findByActivoTrue().stream().map(this::toDTO).toList();
    }

    @Override
    public void submitFormulario(FormSubmissionDTO submission) {
        ProcesoInstancia instancia = procesoInstanciaRepository
                .findById(submission.getProcesoInstanciaId())
                .orElseThrow(() -> new ResourceNotFoundException("Instancia", submission.getProcesoInstanciaId()));
        if (submission.getDatos() != null) {
            instancia.getDatosFormulario().putAll(submission.getDatos());
        }
        instancia.setUpdatedAt(LocalDateTime.now());
        procesoInstanciaRepository.save(instancia);
    }

    private FormDTO toDTO(Form f) {
        FormDTO dto = new FormDTO();
        dto.setId(f.getId());
        dto.setNombre(f.getNombre());
        dto.setTipoSolicitud(f.getTipoSolicitud());
        dto.setVersion(f.getVersion());
        dto.setActivo(f.isActivo());
        dto.setCreatedAt(f.getCreatedAt());
        List<FormFieldDTO> campos = new ArrayList<>();
        f.getCampos().forEach(field -> {
            FormFieldDTO fd = new FormFieldDTO();
            fd.setId(field.getId());
            fd.setNombre(field.getNombre());
            fd.setEtiqueta(field.getEtiqueta());
            fd.setTipo(field.getTipo());
            fd.setRequerido(field.isRequerido());
            fd.setValorDefault(field.getValorDefault());
            fd.setOrden(field.getOrden());
            campos.add(fd);
        });
        dto.setCampos(campos);
        return dto;
    }
}
