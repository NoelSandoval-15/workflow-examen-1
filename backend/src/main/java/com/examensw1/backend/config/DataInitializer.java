package com.examensw1.backend.config;

import com.examensw1.backend.modules.cliente.domain.Cliente;
import com.examensw1.backend.modules.cliente.repository.ClienteRepository;
import com.examensw1.backend.modules.form.domain.Form;
import com.examensw1.backend.modules.form.domain.FormField;
import com.examensw1.backend.modules.form.repository.FormRepository;
import com.examensw1.backend.modules.notification.domain.Notification;
import com.examensw1.backend.modules.notification.repository.NotificationRepository;
import com.examensw1.backend.modules.organization.domain.Departamento;
import com.examensw1.backend.modules.organization.domain.Rol;
import com.examensw1.backend.modules.organization.repository.DepartamentoRepository;
import com.examensw1.backend.modules.organization.repository.RolRepository;
import com.examensw1.backend.modules.task.domain.Task;
import com.examensw1.backend.modules.task.repository.TaskRepository;
import com.examensw1.backend.modules.user.domain.User;
import com.examensw1.backend.modules.user.repository.UserRepository;
import com.examensw1.backend.modules.workflow.domain.HistorialEntry;
import com.examensw1.backend.modules.workflow.domain.ProcesoInstancia;
import com.examensw1.backend.modules.workflow.domain.Workflow;
import com.examensw1.backend.modules.workflow.domain.WorkflowEdge;
import com.examensw1.backend.modules.workflow.domain.WorkflowNode;
import com.examensw1.backend.modules.workflow.repository.ProcesoInstanciaRepository;
import com.examensw1.backend.modules.workflow.repository.WorkflowRepository;
import com.examensw1.backend.shared.enums.NodeType;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "123456";
    private static final String ADMIN_PASSWORD = "admin123";

    private final UserRepository userRepository;
    private final ClienteRepository clienteRepository;
    private final PasswordEncoder passwordEncoder;
    private final RolRepository rolRepository;
    private final DepartamentoRepository departamentoRepository;
    private final FormRepository formRepository;
    private final WorkflowRepository workflowRepository;
    private final ProcesoInstanciaRepository procesoInstanciaRepository;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;

    @Override
    public void run(String... args) {
        seedRoles();
        seedDepartamentos();
        seedUsuarios();
        seedClientes();
        seedUsuariosParaClientes();
        seedFormularios();
        seedWorkflows();
        seedProcesosInstancia();
        seedTareas();
        seedNotificaciones();

        System.out.println(">>> Seeders cargados correctamente");
    }

    private void seedRoles() {
        createRol("ADMIN", "Administrador", "Acceso completo al sistema");
        createRol("CLIENTE", "Cliente", "Usuario externo que inicia y consulta solicitudes");
        createRol("FUNCIONARIO", "Funcionario", "Usuario interno que atiende tareas asignadas");
        createRol("SUPERVISOR", "Supervisor", "Usuario responsable de seguimiento y control");
        createRol("JEFE_DEPARTAMENTO", "Jefe de departamento", "Usuario que aprueba decisiones del area");
    }

    private void seedDepartamentos() {
        createDepartamento("SISTEMA", "Sistema", "Administracion general de la plataforma");
        createDepartamento("ATENCION_CLIENTE", "Atencion al cliente", "Recepcion y revision inicial de solicitudes");
        createDepartamento("LEGAL", "Legal", "Revision legal de documentos y requisitos");
        createDepartamento("FINANZAS", "Finanzas", "Validacion de pagos y costos asociados");
        createDepartamento("OPERACIONES", "Operaciones", "Ejecucion y cierre operativo de solicitudes");
        createDepartamento("ARCHIVO", "Archivo", "Custodia y validacion documental");
    }

    private void seedUsuarios() {
        createUser("USER_ADMIN", "admin", "admin@cree.com", "Administrador", "Sistema", "70000001",
                "ADMIN", "SISTEMA", ADMIN_PASSWORD);
        createUser("USER_ATENCION", "atencion", "atencion@demo.com", "Mariana", "Quiroga", "70000002",
                "FUNCIONARIO", "ATENCION_CLIENTE", DEFAULT_PASSWORD);
        createUser("USER_LEGAL", "legal", "legal@demo.com", "Laura", "Mamani", "70000003",
                "FUNCIONARIO", "LEGAL", DEFAULT_PASSWORD);
        createUser("USER_FINANZAS", "finanzas", "finanzas@demo.com", "Diego", "Vargas", "70000004",
                "FUNCIONARIO", "FINANZAS", DEFAULT_PASSWORD);
        createUser("USER_SUPERVISOR", "supervisor", "supervisor@demo.com", "Sofia", "Paredes", "70000005",
                "SUPERVISOR", "OPERACIONES", DEFAULT_PASSWORD);
    }

    private void seedClientes() {
        createCliente("CLIENTE_CARLOS", "Carlos", "Rojas", "carlos@demo.com", "76543210",
                "Av. Siempre Viva 123");
        createCliente("CLIENTE_ANA", "Ana", "Salazar", "ana@demo.com", "76543211",
                "Calle Comercio 456");
        createCliente("CLIENTE_MIGUEL", "Miguel", "Torres", "miguel@demo.com", "76543212",
                "Zona Central 789");
    }

    private void seedUsuariosParaClientes() {
        var clientes = clienteRepository.findAll();
        for (Cliente cliente : clientes) {
            if (cliente.getCorreo() == null || userRepository.existsByUsername(cliente.getCorreo())) {
                continue;
            }

            User user = new User();
            user.setId("USER_CLIENTE_" + cliente.getId());
            user.setUsername(cliente.getCorreo());
            user.setCorreo(cliente.getCorreo());
            user.setNombre(cliente.getNombre());
            user.setApellido(cliente.getApellido());
            user.setTelefono(cliente.getTelefono());
            user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
            user.setRolId("CLIENTE");
            user.setActivo(true);
            userRepository.save(user);
            System.out.println(">>> Usuario cliente creado: " + cliente.getCorreo() + " / " + DEFAULT_PASSWORD);
        }
    }

    private void seedFormularios() {
        if (findFormByTipoAndNombre("SOLICITUD_SERVICIO", "Formulario de Solicitud de Servicio") == null) {
            Form form = new Form();
            form.setId("FORM_SOLICITUD_SERVICIO");
            form.setNombre("Formulario de Solicitud de Servicio");
            form.setTipoSolicitud("SOLICITUD_SERVICIO");
            form.setVersion(1);
            form.setActivo(true);
            form.setCampos(List.of(
                    field("nombreCompleto", "nombreCompleto", "Nombre completo", "TEXT", true, "", 1),
                    field("ci", "ci", "Documento de identidad", "TEXT", true, "", 2),
                    field("telefono", "telefono", "Telefono de contacto", "TEXT", true, "", 3),
                    field("descripcionSolicitud", "descripcionSolicitud", "Descripcion de la solicitud", "TEXTAREA", true, "", 4),
                    field("documentoAdjunto", "documentoAdjunto", "Documento de respaldo", "FILE", false, "", 5)
            ));
            formRepository.save(form);
        }

        if (findFormByTipoAndNombre("RECLAMO_CLIENTE", "Formulario de Reclamo de Cliente") == null) {
            Form form = new Form();
            form.setId("FORM_RECLAMO_CLIENTE");
            form.setNombre("Formulario de Reclamo de Cliente");
            form.setTipoSolicitud("RECLAMO_CLIENTE");
            form.setVersion(1);
            form.setActivo(true);
            form.setCampos(List.of(
                    field("motivo", "motivo", "Motivo del reclamo", "TEXT", true, "", 1),
                    field("detalle", "detalle", "Detalle del reclamo", "TEXTAREA", true, "", 2),
                    field("fechaIncidente", "fechaIncidente", "Fecha del incidente", "DATE", true, "", 3),
                    field("evidencia", "evidencia", "Evidencia adjunta", "FILE", false, "", 4)
            ));
            formRepository.save(form);
        }
    }

    private void seedWorkflows() {
        if (workflowRepository.findByNombre("Proceso de Solicitud de Servicio").isEmpty()) {
            Workflow workflow = new Workflow();
            workflow.setId("WF_SOLICITUD_SERVICIO");
            workflow.setNombre("Proceso de Solicitud de Servicio");
            workflow.setTipoSolicitud("SOLICITUD_SERVICIO");
            workflow.setVersion(1);
            workflow.setEstado("ACTIVO");
            workflow.setFormularioId("FORM_SOLICITUD_SERVICIO");
            workflow.setCreatedBy(userIdByUsername("admin"));
            workflow.setNodos(List.of(
                    node("NODO_SOL_INICIO", "Solicitud recibida", NodeType.INICIO, null, null, false, 0, 1),
                    node("NODO_SOL_REVISION", "Revision inicial", NodeType.TAREA, "ATENCION_CLIENTE", "FUNCIONARIO", false, 24, 2),
                    node("NODO_SOL_LEGAL", "Revision legal", NodeType.TAREA, "LEGAL", "FUNCIONARIO", true, 48, 3),
                    node("NODO_SOL_DECISION", "Decision de aprobacion", NodeType.DECISION, "OPERACIONES", "SUPERVISOR", false, 24, 4),
                    node("NODO_SOL_FINANZAS", "Validacion financiera", NodeType.TAREA, "FINANZAS", "FUNCIONARIO", true, 24, 5),
                    node("NODO_SOL_FIN", "Solicitud finalizada", NodeType.FIN, null, null, false, 0, 6)
            ));
            workflow.setConexiones(List.of(
                    edge("EDGE_SOL_1", "NODO_SOL_INICIO", "NODO_SOL_REVISION", null, "Iniciar revision"),
                    edge("EDGE_SOL_2", "NODO_SOL_REVISION", "NODO_SOL_LEGAL", null, "Enviar a legal"),
                    edge("EDGE_SOL_3", "NODO_SOL_LEGAL", "NODO_SOL_DECISION", null, "Emitir criterio"),
                    edge("EDGE_SOL_4", "NODO_SOL_DECISION", "NODO_SOL_FINANZAS", "aprobado == true", "Aprobada"),
                    edge("EDGE_SOL_5", "NODO_SOL_FINANZAS", "NODO_SOL_FIN", null, "Cerrar solicitud")
            ));
            workflowRepository.save(workflow);
        }

        if (workflowRepository.findByNombre("Proceso de Reclamo de Cliente").isEmpty()) {
            Workflow workflow = new Workflow();
            workflow.setId("WF_RECLAMO_CLIENTE");
            workflow.setNombre("Proceso de Reclamo de Cliente");
            workflow.setTipoSolicitud("RECLAMO_CLIENTE");
            workflow.setVersion(1);
            workflow.setEstado("ACTIVO");
            workflow.setFormularioId("FORM_RECLAMO_CLIENTE");
            workflow.setCreatedBy(userIdByUsername("admin"));
            workflow.setNodos(List.of(
                    node("NODO_REC_INICIO", "Reclamo recibido", NodeType.INICIO, null, null, false, 0, 1),
                    node("NODO_REC_ATENCION", "Analisis de reclamo", NodeType.TAREA, "ATENCION_CLIENTE", "FUNCIONARIO", false, 24, 2),
                    node("NODO_REC_OPERACIONES", "Resolucion operativa", NodeType.TAREA, "OPERACIONES", "SUPERVISOR", true, 48, 3),
                    node("NODO_REC_FIN", "Reclamo cerrado", NodeType.FIN, null, null, false, 0, 4)
            ));
            workflow.setConexiones(List.of(
                    edge("EDGE_REC_1", "NODO_REC_INICIO", "NODO_REC_ATENCION", null, "Revisar reclamo"),
                    edge("EDGE_REC_2", "NODO_REC_ATENCION", "NODO_REC_OPERACIONES", null, "Resolver"),
                    edge("EDGE_REC_3", "NODO_REC_OPERACIONES", "NODO_REC_FIN", null, "Cerrar reclamo")
            ));
            workflowRepository.save(workflow);
        }
    }

    private void seedProcesosInstancia() {
        createProcesoServicioCarlos();
        createProcesoReclamoAna();
        createProcesoServicioMiguel();
    }

    private void createProcesoServicioCarlos() {
        if (procesoInstanciaRepository.findByCodigo("SOL-2026-0001").isPresent()) {
            return;
        }

        WorkflowNode nodoActual = node("NODO_SOL_LEGAL", "Revision legal", NodeType.TAREA, "LEGAL",
                "FUNCIONARIO", true, 48, 3);

        ProcesoInstancia proceso = new ProcesoInstancia();
        proceso.setId("PROC_SOL_2026_0001");
        proceso.setCodigo("SOL-2026-0001");
        proceso.setTemplateId("WF_SOLICITUD_SERVICIO");
        proceso.setClienteId("CLIENTE_CARLOS");
        proceso.setEstadoActual("EN_PROCESO");
        proceso.setPrioridad("NORMAL");
        proceso.setNodoActual(nodoActual);
        proceso.setResponsableActualId(userIdByUsername("legal"));
        proceso.setDatosFormulario(Map.of(
                "nombreCompleto", "Carlos Rojas",
                "ci", "1234567",
                "telefono", "76543210",
                "descripcionSolicitud", "Solicitud de aprobacion de tramite administrativo"
        ));
        proceso.setHistorialResumen(List.of(
                history("NODO_SOL_INICIO", "Solicitud recibida", userIdByUsername("carlos@demo.com"),
                        "Carlos Rojas", "CREADO", "Solicitud registrada por el cliente", LocalDateTime.now().minusDays(3)),
                history("NODO_SOL_REVISION", "Revision inicial", userIdByUsername("atencion"),
                        "Mariana Quiroga", "APROBADO", "Documentacion inicial completa", LocalDateTime.now().minusDays(2))
        ));
        proceso.setUpdatedAt(LocalDateTime.now().minusHours(8));
        procesoInstanciaRepository.save(proceso);
    }

    private void createProcesoReclamoAna() {
        if (procesoInstanciaRepository.findByCodigo("REC-2026-0001").isPresent()) {
            return;
        }

        WorkflowNode nodoActual = node("NODO_REC_ATENCION", "Analisis de reclamo", NodeType.TAREA,
                "ATENCION_CLIENTE", "FUNCIONARIO", false, 24, 2);

        ProcesoInstancia proceso = new ProcesoInstancia();
        proceso.setId("PROC_REC_2026_0001");
        proceso.setCodigo("REC-2026-0001");
        proceso.setTemplateId("WF_RECLAMO_CLIENTE");
        proceso.setClienteId("CLIENTE_ANA");
        proceso.setEstadoActual("NUEVO");
        proceso.setPrioridad("ALTA");
        proceso.setNodoActual(nodoActual);
        proceso.setResponsableActualId(userIdByUsername("atencion"));
        proceso.setDatosFormulario(Map.of(
                "motivo", "Demora en atencion",
                "detalle", "El tramite no tuvo respuesta dentro del plazo esperado",
                "fechaIncidente", "2026-04-25"
        ));
        proceso.setHistorialResumen(List.of(
                history("NODO_REC_INICIO", "Reclamo recibido", userIdByUsername("ana@demo.com"),
                        "Ana Salazar", "CREADO", "Reclamo registrado por el cliente", LocalDateTime.now().minusDays(1))
        ));
        proceso.setUpdatedAt(LocalDateTime.now().minusHours(6));
        procesoInstanciaRepository.save(proceso);
    }

    private void createProcesoServicioMiguel() {
        if (procesoInstanciaRepository.findByCodigo("SOL-2026-0002").isPresent()) {
            return;
        }

        WorkflowNode nodoActual = node("NODO_SOL_FIN", "Solicitud finalizada", NodeType.FIN, null,
                null, false, 0, 6);

        ProcesoInstancia proceso = new ProcesoInstancia();
        proceso.setId("PROC_SOL_2026_0002");
        proceso.setCodigo("SOL-2026-0002");
        proceso.setTemplateId("WF_SOLICITUD_SERVICIO");
        proceso.setClienteId("CLIENTE_MIGUEL");
        proceso.setEstadoActual("FINALIZADO");
        proceso.setPrioridad("BAJA");
        proceso.setNodoActual(nodoActual);
        proceso.setDatosFormulario(Map.of(
                "nombreCompleto", "Miguel Torres",
                "ci", "7654321",
                "telefono", "76543212",
                "descripcionSolicitud", "Solicitud de actualizacion de datos"
        ));
        proceso.setHistorialResumen(List.of(
                history("NODO_SOL_INICIO", "Solicitud recibida", userIdByUsername("miguel@demo.com"),
                        "Miguel Torres", "CREADO", "Solicitud registrada", LocalDateTime.now().minusDays(7)),
                history("NODO_SOL_FIN", "Solicitud finalizada", userIdByUsername("supervisor"),
                        "Sofia Paredes", "FINALIZADO", "Proceso cerrado correctamente", LocalDateTime.now().minusDays(2))
        ));
        proceso.setUpdatedAt(LocalDateTime.now().minusDays(2));
        proceso.setFinishedAt(LocalDateTime.now().minusDays(2));
        procesoInstanciaRepository.save(proceso);
    }

    private void seedTareas() {
        createTask("TASK_SOL_0001_REV_LEGAL", "PROC_SOL_2026_0001", "SOL-2026-0001",
                "NODO_SOL_LEGAL", "Revisar documentacion legal", "REVISION", "PENDIENTE",
                "LEGAL", userIdByUsername("legal"), true, "Validar respaldo legal enviado por el cliente",
                LocalDateTime.now().minusDays(2), LocalDateTime.now().plusDays(1), null);
        createTask("TASK_REC_0001_ATENCION", "PROC_REC_2026_0001", "REC-2026-0001",
                "NODO_REC_ATENCION", "Analizar reclamo de cliente", "REVISION", "EN_PROGRESO",
                "ATENCION_CLIENTE", userIdByUsername("atencion"), false, "Contactar al cliente y revisar historial",
                LocalDateTime.now().minusDays(1), LocalDateTime.now().plusHours(12), null);
        createTask("TASK_SOL_0002_REVISION", "PROC_SOL_2026_0002", "SOL-2026-0002",
                "NODO_SOL_REVISION", "Revision inicial completada", "REVISION", "COMPLETADA",
                "ATENCION_CLIENTE", userIdByUsername("atencion"), false, "Solicitud aceptada para flujo normal",
                LocalDateTime.now().minusDays(7), LocalDateTime.now().minusDays(6), LocalDateTime.now().minusDays(6));
        createTask("TASK_SOL_0002_FINANZAS", "PROC_SOL_2026_0002", "SOL-2026-0002",
                "NODO_SOL_FINANZAS", "Validacion financiera completada", "VALIDACION", "COMPLETADA",
                "FINANZAS", userIdByUsername("finanzas"), true, "Validacion sin observaciones",
                LocalDateTime.now().minusDays(5), LocalDateTime.now().minusDays(4), LocalDateTime.now().minusDays(4));
        createTask("TASK_SUP_REVISION", "PROC_SOL_2026_0001", "SOL-2026-0001",
                "NODO_SOL_DECISION", "Seguimiento de solicitud prioritaria", "APROBACION", "PENDIENTE",
                "OPERACIONES", userIdByUsername("supervisor"), false, "Preparar decision posterior a revision legal",
                LocalDateTime.now().minusHours(10), LocalDateTime.now().plusDays(2), null);
    }

    private void seedNotificaciones() {
        createNotification("NOTIF_LEGAL_1", userIdByUsername("legal"), "Nueva tarea asignada",
                "Tienes pendiente la revision legal de la solicitud SOL-2026-0001.",
                "TAREA_ASIGNADA", "TASK_SOL_0001_REV_LEGAL", false);
        createNotification("NOTIF_ATENCION_1", userIdByUsername("atencion"), "Reclamo en analisis",
                "El reclamo REC-2026-0001 requiere revision inicial.",
                "TAREA_ASIGNADA", "TASK_REC_0001_ATENCION", false);
        createNotification("NOTIF_SUPERVISOR_1", userIdByUsername("supervisor"), "Seguimiento pendiente",
                "La solicitud SOL-2026-0001 esta esperando decision de aprobacion.",
                "PROCESO_ACTUALIZADO", "PROC_SOL_2026_0001", false);
        createNotification("NOTIF_CLIENTE_CARLOS_1", userIdByUsername("carlos@demo.com"), "Solicitud en proceso",
                "Tu solicitud SOL-2026-0001 se encuentra en revision legal.",
                "PROCESO_ACTUALIZADO", "PROC_SOL_2026_0001", false);
        createNotification("NOTIF_CLIENTE_MIGUEL_1", userIdByUsername("miguel@demo.com"), "Solicitud finalizada",
                "Tu solicitud SOL-2026-0002 fue finalizada correctamente.",
                "SOLICITUD_APROBADA", "PROC_SOL_2026_0002", true);
    }

    private void createRol(String id, String nombre, String descripcion) {
        if (rolRepository.existsById(id)) {
            return;
        }

        Rol rol = new Rol();
        rol.setId(id);
        rol.setNombre(nombre);
        rol.setDescripcion(descripcion);
        rol.setActivo(true);
        rolRepository.save(rol);
    }

    private void createDepartamento(String id, String nombre, String descripcion) {
        if (departamentoRepository.existsById(id)) {
            return;
        }

        Departamento departamento = new Departamento();
        departamento.setId(id);
        departamento.setNombre(nombre);
        departamento.setDescripcion(descripcion);
        departamento.setActivo(true);
        departamentoRepository.save(departamento);
    }

    private void createUser(String id, String username, String correo, String nombre, String apellido,
                            String telefono, String rolId, String departamentoId, String password) {
        if (userRepository.existsByUsername(username) || userRepository.existsByCorreo(correo)) {
            return;
        }

        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setCorreo(correo);
        user.setNombre(nombre);
        user.setApellido(apellido);
        user.setTelefono(telefono);
        user.setRolId(rolId);
        user.setDepartamentoId(departamentoId);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setActivo(true);
        userRepository.save(user);
        System.out.println(">>> Usuario creado: " + username + " / " + password);
    }

    private void createCliente(String id, String nombre, String apellido, String correo, String telefono,
                               String direccion) {
        if (clienteRepository.existsById(id) || clienteRepository.existsByCorreo(correo)) {
            return;
        }

        Cliente cliente = new Cliente();
        cliente.setId(id);
        cliente.setNombre(nombre);
        cliente.setApellido(apellido);
        cliente.setCorreo(correo);
        cliente.setTelefono(telefono);
        cliente.setDireccion(direccion);
        cliente.setActivo(true);
        clienteRepository.save(cliente);
    }

    private void createTask(String id, String procesoInstanciaId, String procesoInstanciaCodigo, String nodoId,
                            String nombre, String tipo, String estado, String departamentoAsignadoId,
                            String usuarioAsignadoId, boolean requiereEvidencia, String observacion,
                            LocalDateTime fechaInicio, LocalDateTime fechaLimite, LocalDateTime fechaCompletado) {
        if (taskRepository.existsById(id)) {
            return;
        }

        Task task = new Task();
        task.setId(id);
        task.setProcesoInstanciaId(procesoInstanciaId);
        task.setProcesoInstanciaCodigo(procesoInstanciaCodigo);
        task.setNodoId(nodoId);
        task.setNombre(nombre);
        task.setTipo(tipo);
        task.setEstado(estado);
        task.setDepartamentoAsignadoId(departamentoAsignadoId);
        task.setUsuarioAsignadoId(usuarioAsignadoId);
        task.setRequiereEvidencia(requiereEvidencia);
        task.setObservacion(observacion);
        task.setFechaInicio(fechaInicio);
        task.setFechaLimite(fechaLimite);
        task.setFechaCompletado(fechaCompletado);
        taskRepository.save(task);
    }

    private void createNotification(String id, String usuarioId, String titulo, String mensaje, String tipo,
                                    String referenciaId, boolean leida) {
        if (notificationRepository.existsById(id) || usuarioId == null) {
            return;
        }

        Notification notification = new Notification();
        notification.setId(id);
        notification.setUsuarioId(usuarioId);
        notification.setTitulo(titulo);
        notification.setMensaje(mensaje);
        notification.setTipo(tipo);
        notification.setReferenciaId(referenciaId);
        notification.setLeida(leida);
        notificationRepository.save(notification);
    }

    private Form findFormByTipoAndNombre(String tipoSolicitud, String nombre) {
        return formRepository.findByTipoSolicitud(tipoSolicitud).stream()
                .filter(form -> nombre.equals(form.getNombre()))
                .findFirst()
                .orElse(null);
    }

    private String userIdByUsername(String username) {
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElse(null);
    }

    private FormField field(String id, String nombre, String etiqueta, String tipo, boolean requerido,
                            String valorDefault, int orden) {
        FormField field = new FormField();
        field.setId(id);
        field.setNombre(nombre);
        field.setEtiqueta(etiqueta);
        field.setTipo(tipo);
        field.setRequerido(requerido);
        field.setValorDefault(valorDefault);
        field.setOrden(orden);
        return field;
    }

    private WorkflowNode node(String id, String nombre, NodeType tipo, String departamentoId, String rolRequerido,
                              boolean requiereEvidencia, int tiempoLimiteHoras, int orden) {
        WorkflowNode node = new WorkflowNode();
        node.setId(id);
        node.setNombre(nombre);
        node.setTipo(tipo);
        node.setDepartamentoId(departamentoId);
        node.setRolRequerido(rolRequerido);
        node.setRequiereEvidencia(requiereEvidencia);
        node.setTiempoLimiteHoras(tiempoLimiteHoras);
        node.setOrden(orden);
        return node;
    }

    private WorkflowEdge edge(String id, String nodoOrigenId, String nodoDestinoId, String condicion,
                              String etiqueta) {
        WorkflowEdge edge = new WorkflowEdge();
        edge.setId(id);
        edge.setNodoOrigenId(nodoOrigenId);
        edge.setNodoDestinoId(nodoDestinoId);
        edge.setCondicion(condicion);
        edge.setEtiqueta(etiqueta);
        return edge;
    }

    private HistorialEntry history(String nodoId, String nodoNombre, String usuarioId, String usuarioNombre,
                                   String accion, String observacion, LocalDateTime fecha) {
        HistorialEntry entry = new HistorialEntry();
        entry.setNodoId(nodoId);
        entry.setNodoNombre(nodoNombre);
        entry.setUsuarioId(usuarioId);
        entry.setUsuarioNombre(usuarioNombre);
        entry.setAccion(accion);
        entry.setObservacion(observacion);
        entry.setFecha(fecha);
        return entry;
    }
}
