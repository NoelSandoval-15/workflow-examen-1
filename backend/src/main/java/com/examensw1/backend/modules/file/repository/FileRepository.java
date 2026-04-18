package com.examensw1.backend.modules.file.repository;

import com.examensw1.backend.modules.file.domain.FileMetadata;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface FileRepository extends MongoRepository<FileMetadata, String> {
    List<FileMetadata> findByProcesoInstanciaId(String procesoInstanciaId);
    List<FileMetadata> findByTareaId(String tareaId);
    List<FileMetadata> findByEsEvidenciaTrue();
}
