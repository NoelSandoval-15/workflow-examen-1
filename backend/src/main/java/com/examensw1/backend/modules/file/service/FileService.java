package com.examensw1.backend.modules.file.service;

import com.examensw1.backend.modules.file.dto.FileDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface FileService {
    FileDTO subirArchivo(MultipartFile file, String procesoInstanciaId,
                         String tareaId, String usuarioId, boolean esEvidencia, String descripcion);
    List<FileDTO> listarPorInstancia(String procesoInstanciaId);
    List<FileDTO> listarPorTarea(String tareaId);
    void eliminarArchivo(String id);
}
