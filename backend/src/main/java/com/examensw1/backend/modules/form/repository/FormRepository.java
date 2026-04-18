package com.examensw1.backend.modules.form.repository;

import com.examensw1.backend.modules.form.domain.Form;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface FormRepository extends MongoRepository<Form, String> {
    List<Form> findByActivoTrue();
    List<Form> findByTipoSolicitud(String tipoSolicitud);
}
