package com.examensw1.backend.config;

import org.camunda.bpm.engine.spring.SpringProcessEngineConfiguration;
import org.camunda.bpm.spring.boot.starter.configuration.impl.AbstractCamundaConfiguration;
import org.springframework.context.annotation.Configuration;

/**
 * Ajustes del motor Camunda 7
 * - History level FULL para tener trazabilidad completa.
 * - Job executor habilitado para tareas de tiempo.
 * - Sin despliegue automático de BPMN al arrancar (lo hacemos en activarTemplate).
 */
@Configuration
public class CamundaEngineConfig extends AbstractCamundaConfiguration {

    @Override
    public void preInit(SpringProcessEngineConfiguration config) {
        config.setHistory("full");
        config.setJobExecutorActivate(true);
        config.setDatabaseSchemaUpdate("true");
    }
}
