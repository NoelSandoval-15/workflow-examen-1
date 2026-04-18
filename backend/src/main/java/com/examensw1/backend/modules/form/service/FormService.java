package com.examensw1.backend.modules.form.service;

import com.examensw1.backend.modules.form.dto.FormDTO;
import com.examensw1.backend.modules.form.dto.FormSubmissionDTO;

import java.util.List;

public interface FormService {
    FormDTO crearFormulario(FormDTO request);
    FormDTO obtenerFormulario(String id);
    List<FormDTO> listarFormularios();
    void submitFormulario(FormSubmissionDTO submission);
}
