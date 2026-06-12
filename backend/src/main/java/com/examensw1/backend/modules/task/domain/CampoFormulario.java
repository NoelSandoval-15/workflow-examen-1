package com.examensw1.backend.modules.task.domain;

import lombok.Getter;
import lombok.Setter;

/**
 * Representa un campo dentro del formulario dinámico de una tarea.
 * El funcionario define etiqueta, tipo y luego llena el valor.
 */
@Getter
@Setter
public class CampoFormulario {

    /** Identificador único del campo (generado en frontend con UUID) */
    private String id;

    /** Etiqueta que ve el funcionario, ej: "Número de expediente" */
    private String etiqueta;

    /** Tipo de campo: TEXTO | NUMERO | FECHA | ARCHIVO | SELECT | CHECKLIST | TABLA */
    private String tipo;

    /** Si el campo es obligatorio antes de avanzar */
    private boolean requerido;

    /** Valor ingresado por el funcionario (texto, número o fecha como String) */
    private String valor;

    /** URL del archivo subido (solo aplica cuando tipo = ARCHIVO) */
    private String archivoUrl;

    /** Nombre original del archivo subido */
    private String archivoNombre;

    /** Opciones para SELECT, CHECKLIST o configuración de columnas de la TABLA (guardado como JSON o cadena delimitada) */
    private String opciones;
}
