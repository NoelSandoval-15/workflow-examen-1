package com.examensw1.backend.modules.workflow.domain;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReglaPermisoDocumento {
    private String rolODepartamento;
    private String permisoPdf;        // VER, EDITAR, SIN_ACCESO
    private String permisoWord;
    private String permisoExcel;
    private String permisoImagenes;
    private String permisoAudioVideo;

    public ReglaPermisoDocumento() {
    }

    public ReglaPermisoDocumento(String rolODepartamento, String permisoPdf, String permisoWord, String permisoExcel, String permisoImagenes, String permisoAudioVideo) {
        this.rolODepartamento = rolODepartamento;
        this.permisoPdf = permisoPdf;
        this.permisoWord = permisoWord;
        this.permisoExcel = permisoExcel;
        this.permisoImagenes = permisoImagenes;
        this.permisoAudioVideo = permisoAudioVideo;
    }
}
