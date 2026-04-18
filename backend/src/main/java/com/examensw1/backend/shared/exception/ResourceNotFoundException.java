package com.examensw1.backend.shared.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, String id) {
        super(resource + " no encontrado con id: " + id);
    }
}
