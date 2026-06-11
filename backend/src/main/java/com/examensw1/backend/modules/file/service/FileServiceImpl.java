package com.examensw1.backend.modules.file.service;

import com.examensw1.backend.modules.file.domain.FileMetadata;
import com.examensw1.backend.modules.file.dto.FileDTO;
import com.examensw1.backend.modules.file.repository.FileRepository;
import com.examensw1.backend.shared.exception.BusinessException;
import com.examensw1.backend.shared.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class FileServiceImpl implements FileService {

    private final FileRepository fileRepository;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;

    public FileServiceImpl(FileRepository fileRepository, S3Client s3Client,
                           S3Presigner s3Presigner,
                           @Value("${aws.s3.bucket}") String bucketName) {
        this.fileRepository = fileRepository;
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
    }

    @Override
    public FileDTO subirArchivo(MultipartFile file, String procesoInstanciaId,
                                String tareaId, String usuarioId,
                                boolean esEvidencia, String descripcion) {
        try {
            String extension = getExtension(file.getOriginalFilename());
            String nombreUnico = UUID.randomUUID() + "." + extension;

            // Estructura organizada: files/{instancia}/{nodo}/{uuid}.ext
            // Si no hay contexto de tarea (ej. admin), va a files/general/{uuid}.ext
            String instanciaSegmento = (procesoInstanciaId != null && !procesoInstanciaId.isBlank())
                    ? procesoInstanciaId : "general";
            String nodoSegmento = (tareaId != null && !tareaId.isBlank())
                    ? tareaId : "sin-nodo";
            String key = "files/" + instanciaSegmento + "/" + nodoSegmento + "/" + nombreUnico;


            s3Client.putObject(PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build(), RequestBody.fromBytes(file.getBytes()));

            FileMetadata metadata = new FileMetadata();
            metadata.setProcesoInstanciaId(procesoInstanciaId);
            metadata.setTareaId(tareaId);
            metadata.setSubidoPorId(usuarioId);
            metadata.setNombreArchivo(file.getOriginalFilename());
            metadata.setRuta(key);
            metadata.setMimeType(file.getContentType());
            metadata.setExtension(extension);
            metadata.setTamanoBytes(file.getSize());
            metadata.setEsEvidencia(esEvidencia);
            metadata.setDescripcion(descripcion);
            // Genera la clave de sesión inicial para OnlyOffice
            metadata.setVersionKey(UUID.randomUUID().toString());

            return toDTO(fileRepository.save(metadata));
        } catch (IOException e) {
            throw new BusinessException("Error al subir archivo a S3: " + e.getMessage());
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
    public List<FileDTO> listarTodos() {
        return fileRepository.findAll()
                .stream().map(this::toDTO).toList();
    }

    @Override
    public FileDTO obtenerPorId(String id) {
        return fileRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Archivo", id));
    }

    @Override
    public void eliminarArchivo(String id) {
        FileMetadata file = fileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Archivo", id));
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(file.getRuta())
                    .build());
        } catch (Exception e) {
            throw new BusinessException("Error al eliminar archivo de S3: " + e.getMessage());
        }
        fileRepository.delete(file);
    }

    @Override
    public byte[] obtenerContenidoArchivo(String id) {
        FileMetadata file = fileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Archivo", id));
        try {
            return s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(file.getRuta())
                    .build()).asByteArray();
        } catch (Exception e) {
            throw new BusinessException("Error al descargar archivo desde S3: " + e.getMessage());
        }
    }

    @Override
    public void actualizarArchivoDesdeUrl(String id, String downloadUrl, boolean esCierre) {
        FileMetadata file = fileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Archivo", id));
        try {
            // FIX: OnlyOffice genera la URL del documento usando su dirección interna
            // (ej. http://localhost/cache/... o http://onlyoffice/cache/...)
            // El backend corre fuera de Docker, por lo que debe acceder via el puerto
            // expuesto del contenedor (8081 → 80 interno). Reemplazamos cualquier host
            // por localhost:8081 para que Spring Boot pueda descargar el archivo editado.
            String fixedUrl = downloadUrl.replaceFirst("^https?://[^/]*", "http://localhost:8081");

            URL url = new URL(fixedUrl);
            byte[] bytes;
            try (InputStream in = url.openStream();
                 ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096];
                int n;
                while ((n = in.read(buffer)) != -1) {
                    out.write(buffer, 0, n);
                }
                bytes = out.toByteArray();
            }

            s3Client.putObject(PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(file.getRuta())
                    .contentType(file.getMimeType())
                    .build(), RequestBody.fromBytes(bytes));

            file.setTamanoBytes((long) bytes.length);

            // La versionKey SOLO se regenera cuando el documento se cierra definitivamente (status=2).
            // En autosave (status=6), mantener la key existente es crítico para que los
            // usuarios que abran el documento durante el autosave se unan a la sesión activa
            // y no inicien una sesión paralela con una key diferente.
            if (esCierre) {
                file.setVersionKey(UUID.randomUUID().toString());
            }

            fileRepository.save(file);
        } catch (Exception e) {
            throw new BusinessException("Error al guardar archivo editado por OnlyOffice: " + e.getMessage());
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "bin";
        return filename.substring(filename.lastIndexOf(".") + 1);
    }

    @Override
    public String generarPresignedUrl(String id) {
        FileMetadata file = fileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Archivo", id));
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(file.getRuta())
                    .build();
            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofHours(1))
                    .getObjectRequest(getObjectRequest)
                    .build();
            PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
            return presigned.url().toString();
        } catch (Exception e) {
            throw new BusinessException("Error al generar URL pre-firmada: " + e.getMessage());
        }
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
        // Usa el id como fallback si el documento fue creado antes de este campo
        dto.setVersionKey(f.getVersionKey() != null ? f.getVersionKey() : f.getId());
        dto.setCreatedAt(f.getCreatedAt());
        return dto;
    }
}
