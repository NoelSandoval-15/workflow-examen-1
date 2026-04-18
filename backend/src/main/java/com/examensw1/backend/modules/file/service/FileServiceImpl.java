package com.examensw1.backend.modules.file.service;

import com.examensw1.backend.modules.file.domain.FileMetadata;
import com.examensw1.backend.modules.file.dto.FileDTO;
import com.examensw1.backend.modules.file.repository.FileRepository;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private final FileRepository fileRepository;
    private static final String UPLOAD_DIR = "uploads/";

    @Override
    public FileDTO subirArchivo(MultipartFile file, String procesoInstanciaId,
                                String tareaId, String usuarioId,
                                boolean esEvidencia, String descripcion) {
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

            String extension = getExtension(file.getOriginalFilename());
            String nombreUnico = UUID.randomUUID() + "." + extension;
            Path filePath = uploadPath.resolve(nombreUnico);
            Files.write(filePath, file.getBytes());

            FileMetadata metadata = new FileMetadata();
            metadata.setProcesoInstanciaId(procesoInstanciaId);
            metadata.setTareaId(tareaId);
            metadata.setSubidoPorId(usuarioId);
            metadata.setNombreArchivo(file.getOriginalFilename());
            metadata.setRuta(filePath.toString());
            metadata.setMimeType(file.getContentType());
            metadata.setExtension(extension);
            metadata.setTamanoBytes(file.getSize());
            metadata.setEsEvidencia(esEvidencia);
            metadata.setDescripcion(descripcion);

            return toDTO(fileRepository.save(metadata));
        } catch (IOException e) {
            throw new BusinessException("Error al guardar el archivo: " + e.getMessage());
        }
    }

    @Override
    public List<FileDTO> listarPorInstancia(String procesoInstanciaId) {
        return fileRepository.findByProcesoInstanciaId(procesoInstanciaId)
                .stream().map(this::toDTO).toList();
    }

    @Override
    public List<FileDTO> listarPorTarea(String tareaId) {
        return fileRepository.findByTareaId(tareaId)
                .stream().map(this::toDTO).toList();
    }

    @Override
    public void eliminarArchivo(String id) {
        FileMetadata file = fileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Archivo", id));
        try {
            Files.deleteIfExists(Paths.get(file.getRuta()));
        } catch (IOException e) {
            throw new BusinessException("Error al eliminar el archivo");
        }
        fileRepository.delete(file);
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "bin";
        return filename.substring(filename.lastIndexOf(".") + 1);
    }

    private FileDTO toDTO(FileMetadata f) {
        FileDTO dto = new FileDTO();
        dto.setId(f.getId());
        dto.setProcesoInstanciaId(f.getProcesoInstanciaId());
        dto.setTareaId(f.getTareaId());
        dto.setSubidoPorId(f.getSubidoPorId());
        dto.setNombreArchivo(f.getNombreArchivo());
        dto.setRuta(f.getRuta());
        dto.setMimeType(f.getMimeType());
        dto.setExtension(f.getExtension());
        dto.setTamanoBytes(f.getTamanoBytes());
        dto.setEsEvidencia(f.isEsEvidencia());
        dto.setDescripcion(f.getDescripcion());
        dto.setCreatedAt(f.getCreatedAt());
        return dto;
    }
}
