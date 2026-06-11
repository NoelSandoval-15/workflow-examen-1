import os
import datetime
import random
from pymongo import MongoClient
from bson import ObjectId

# Configuración de conexión
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "examensw1")

def sembrar_datos():
    print(f"Conectando a MongoDB en {MONGODB_URL}...")
    client = MongoClient(MONGODB_URL)
    db = client[DATABASE_NAME]

    # 1. Limpiar datos de prueba de seeders anteriores (preservando configuraciones reales y manuales del usuario)
    print("Limpiando datos de prueba de seeders anteriores...")
    db["usuarios"].delete_many({"$or": [{"esSeeder": True}, {"username": {"$regex": "seeder", "$options": "i"}}, {"_id": {"$regex": "USER_SEEDER", "$options": "i"}}, {"_id": {"$in": ["USER_LEGAL_SEEDER", "USER_FINANZAS_SEEDER"]}}]})
    db["clientes"].delete_many({"$or": [{"esSeeder": True}, {"correo": {"$regex": "seeder", "$options": "i"}}]})
    db["proceso_instancias"].delete_many({"$or": [{"esSeeder": True}, {"codigo": {"$regex": "TRM-SEED", "$options": "i"}}]})
    db["tareas"].delete_many({"$or": [{"esSeeder": True}, {"_id": {"$regex": "TASK_SEED", "$options": "i"}}]})
    db["archivos"].delete_many({"esSeeder": True})
    seeded_template_ids = [ObjectId(f"69e31b831f470c234de982{index:02d}") for index in range(1, 21)]
    db["proceso_templates"].delete_many({"$or": [{"esSeeder": True}, {"_id": {"$in": seeded_template_ids}}]})

    # Rango de fechas solicitado: 1 de Julio de 2025 hasta 9 de Junio de 2026
    fecha_inicio_sistema = datetime.datetime(2025, 7, 1, 8, 0, 0)
    fecha_hoy = datetime.datetime(2026, 6, 9, 15, 0, 0)
    delta_total = fecha_hoy - fecha_inicio_sistema

    # 2. Sembrar Roles de forma segura (sin borrar ni sobreescribir los existentes del usuario para cuidar la gestión colaborativa)
    print("Sembrando roles de forma segura...")
    roles = [
        {
            "_id": "ADMIN",
            "nombre": "Administrador",
            "descripcion": "Acceso total al sistema y configuraciones",
            "activo": True,
            "esSeeder": True,
            "createdAt": fecha_inicio_sistema,
            "_class": "com.examensw1.backend.modules.organization.domain.Rol"
        },
        {
            "_id": "funcionario",
            "nombre": "Funcionario",
            "descripcion": "Usuario de departamento que procesa tareas de trámites",
            "activo": True,
            "esSeeder": True,
            "createdAt": fecha_inicio_sistema,
            "_class": "com.examensw1.backend.modules.organization.domain.Rol"
        },
        {
            "_id": "cliente",
            "nombre": "Cliente",
            "descripcion": "Usuario solicitante externo",
            "activo": True,
            "esSeeder": True,
            "createdAt": fecha_inicio_sistema,
            "_class": "com.examensw1.backend.modules.organization.domain.Rol"
        }
    ]
    for r in roles:
        db["roles"].update_one({"_id": r["_id"]}, {"$setOnInsert": r}, upsert=True)

    # 3. Sembrar 15 Departamentos de forma segura (sin borrar ni sobreescribir los existentes)
    print("Sembrando 15 departamentos de forma segura...")
    dpto_info = [
        ("LEGAL", "Legal", "Asesoría y revisión de contratos"),
        ("FINANZAS", "Finanzas", "Control presupuestario y facturación"),
        ("ATENCION_CLIENTE", "Atención al Cliente", "Recepción y soporte general"),
        ("SISTEMAS", "Sistemas", "Soporte técnico y administración de TI"),
        ("RECURSOS_HUMANOS", "Recursos Humanos", "Gestión de personal y talento"),
        ("CONTABILIDAD", "Contabilidad", "Registro y auditoría contable"),
        ("COMPRAS", "Compras", "Adquisición de suministros y servicios"),
        ("VENTAS", "Ventas", "Atención comercial y cotizaciones"),
        ("MARKETING", "Marketing", "Publicidad y branding"),
        ("LOGISTICA", "Logística", "Gestión de inventarios y despacho"),
        ("OPERACIONES", "Operaciones", "Ejecución de actividades core"),
        ("AUDITORIA", "Auditoría", "Control interno y calidad"),
        ("SOPORTE", "Soporte", "Atención a reclamos e incidentes"),
        ("FACTURACION", "Facturación", "Generación de facturas y cobros"),
        ("COBRANZAS", "Cobranzas", "Recuperación de deudas y cartera")
    ]
    
    departamentos = []
    for code, name, desc in dpto_info:
        d = {
            "_id": code,
            "nombre": name,
            "descripcion": desc,
            "activo": True,
            "esSeeder": True,
            "createdAt": fecha_inicio_sistema,
            "_class": "com.examensw1.backend.modules.organization.domain.Departamento"
        }
        db["departamentos"].update_one({"_id": code}, {"$setOnInsert": d}, upsert=True)

    # 4. Generar y Sembrar 100 Funcionarios/Usuarios
    print("Generando 100 funcionarios...")
    funcionarios_db = []
    
    # Aseguramos a Laura y Juan como los primeros funcionarios con fechas y departamentos clave
    usr_legal_id = "USER_LEGAL_SEEDER"
    usr_finanzas_id = "USER_FINANZAS_SEEDER"
    
    # Hash de contraseña precalculado compatible (encriptación de "123456")
    dummy_pass_hash = "$2a$10$652eXZVF8MZoB32o4kEFR.PEEgcfxKjPAkzrOksbH5hBs4NYwxxyi"

    laura_gomez = {
        "_id": usr_legal_id,
        "username": "laura_seeder",
        "nombre": "Laura",
        "apellido": "Gomez",
        "correo": "laura.seeder@workflow.com",
        "passwordHash": dummy_pass_hash,
        "rolId": "funcionario",
        "departamentoId": "LEGAL",
        "activo": True,
        "esSeeder": True,
        "createdAt": datetime.datetime(2026, 5, 25, 12, 0, 0),
        "_class": "com.examensw1.backend.modules.user.domain.User"
    }
    
    juan_perez = {
        "_id": usr_finanzas_id,
        "username": "juan_seeder",
        "nombre": "Juan (Seeder)",
        "apellido": "Perez",
        "correo": "juan.seeder@workflow.com",
        "passwordHash": dummy_pass_hash,
        "rolId": "funcionario",
        "departamentoId": "FINANZAS",
        "activo": True,
        "esSeeder": True,
        "createdAt": fecha_inicio_sistema,
        "_class": "com.examensw1.backend.modules.user.domain.User"
    }
    
    funcionarios_db.append(laura_gomez)
    funcionarios_db.append(juan_perez)

    # Nombres aleatorios de ejemplo para completar los 100 funcionarios
    nombres_h = ["Carlos", "Luis", "Diego", "Fernando", "Pedro", "Roberto", "Miguel", "Andres", "Héctor", "Raúl", "Javier", "Manuel", "Sergio", "Jorge", "Gustavo"]
    nombres_m = ["Maria", "Ana", "Patricia", "Rosa", "Sandra", "Carmen", "Sofia", "Gabriela", "Lucia", "Camila", "Andrea", "Daniela", "Elena", "Isabel", "Monica"]
    apellidos_ej = ["Mendoza", "Lopez", "Rojas", "Pardo", "Sánchez", "Guzmán", "Suárez", "Torres", "Ramírez", "Flores", "Vargas", "Ortiz", "Castillo", "Silva", "Morales"]

    for i in range(3, 101):
        dpto_code = dpto_info[(i - 3) % len(dpto_info)][0]
        genero = random.choice(["H", "M"])
        nombre = random.choice(nombres_h) if genero == "H" else random.choice(nombres_m)
        apellido = random.choice(apellidos_ej)
        username = f"{nombre.lower()}_{apellido.lower()}_{i}_seeder"
        
        # Fecha de creación escalonada linealmente
        factor_fecha = (i - 3) / 98.0
        fecha_creado = fecha_inicio_sistema + datetime.timedelta(seconds=int(delta_total.total_seconds() * factor_fecha))

        funcionario = {
            "_id": f"USER_SEEDER_{i:03d}",
            "username": username,
            "nombre": nombre,
            "apellido": apellido,
            "correo": f"{username}@workflow.com",
            "passwordHash": dummy_pass_hash,
            "rolId": "funcionario",
            "departamentoId": dpto_code,
            "activo": True,
            "esSeeder": True,
            "createdAt": fecha_creado,
            "_class": "com.examensw1.backend.modules.user.domain.User"
        }
        funcionarios_db.append(funcionario)

    db["usuarios"].insert_many(funcionarios_db)
    print(f"Sembrados {len(funcionarios_db)} usuarios en MongoDB.")

    # 5. Generar y Sembrar 60 Clientes
    print("Generando 60 clientes...")
    clientes_db = []
    cli_laura_id = ObjectId()
    
    laura_rojas = {
        "_id": cli_laura_id,
        "nombre": "Laura",
        "apellido": "Rojas",
        "correo": "laura.rojas.seeder@gmail.com",
        "telefono": "71234567",
        "direccion": "Av. Banzer #123, Santa Cruz",
        "activo": True,
        "esSeeder": True,
        "createdAt": datetime.datetime(2026, 5, 25, 12, 0, 0),
        "_class": "com.examensw1.backend.modules.cliente.domain.Cliente"
    }
    clientes_db.append(laura_rojas)

    for i in range(2, 61):
        genero = random.choice(["H", "M"])
        nombre = random.choice(nombres_h) if genero == "H" else random.choice(nombres_m)
        apellido = random.choice(apellidos_ej)
        
        # Fecha de creación escalonada
        factor_fecha = (i - 2) / 59.0
        fecha_creado = fecha_inicio_sistema + datetime.timedelta(seconds=int(delta_total.total_seconds() * factor_fecha))

        cliente = {
            "_id": ObjectId(),
            "nombre": nombre,
            "apellido": apellido,
            "correo": f"{nombre.lower()}.{apellido.lower()}.seeder{i}@gmail.com",
            "telefono": f"7{random.randint(1000000, 9999999)}",
            "direccion": f"Calle {random.choice(['Aroma', 'Sucre', 'Bolívar', '24 de Septiembre'])} #{random.randint(10, 999)}, Santa Cruz",
            "activo": True,
            "esSeeder": True,
            "createdAt": fecha_creado,
            "_class": "com.examensw1.backend.modules.cliente.domain.Cliente"
        }
        clientes_db.append(cliente)

    db["clientes"].insert_many(clientes_db)
    print(f"Sembrados {len(clientes_db)} clientes en MongoDB.")

    # 6. Generar y Sembrar 20 Plantillas en Borrador ("BORRADOR")
    print("Sembrando 20 nuevas plantillas lógicas en borrador...")
    plantillas_info = [
        # 1. Boutique de Damas
        {
            "nombre": "Boutique de Damas",
            "tipoSolicitud": "BOUTIQUE",
            "nodos": [
                {"_id": "boutique_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "boutique_t1", "nombre": "Registrar Pedido de Cliente", "tipo": "TAREA", "departamentoId": "VENTAS", "orden": 2},
                {"_id": "boutique_t2", "nombre": "Verificar Stock en Almacén", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 3},
                {"_id": "boutique_gateway", "nombre": "¿Hay Stock Disponible?", "tipo": "DECISION", "orden": 4},
                {"_id": "boutique_t3", "nombre": "Solicitar a Proveedor", "tipo": "TAREA", "departamentoId": "COMPRAS", "orden": 5},
                {"_id": "boutique_t4", "nombre": "Generar Factura de Venta", "tipo": "TAREA", "departamentoId": "FACTURACION", "orden": 6},
                {"_id": "boutique_t5", "nombre": "Despachar y Entregar Ropa", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 7},
                {"_id": "boutique_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 8}
            ],
            "conexiones": [
                {"_id": "boutique_conn_1", "nodoOrigenId": "boutique_inicio", "nodoDestinoId": "boutique_t1"},
                {"_id": "boutique_conn_2", "nodoOrigenId": "boutique_t1", "nodoDestinoId": "boutique_t2"},
                {"_id": "boutique_conn_3", "nodoOrigenId": "boutique_t2", "nodoDestinoId": "boutique_gateway"},
                {"_id": "boutique_conn_4", "nodoOrigenId": "boutique_gateway", "nodoDestinoId": "boutique_t3", "etiqueta": "No hay stock", "condicion": "No"},
                {"_id": "boutique_conn_5", "nodoOrigenId": "boutique_t3", "nodoDestinoId": "boutique_t2", "etiqueta": "Stock recibido", "condicion": "Recibido"},
                {"_id": "boutique_conn_6", "nodoOrigenId": "boutique_gateway", "nodoDestinoId": "boutique_t4", "etiqueta": "Sí hay stock", "condicion": "Sí"},
                {"_id": "boutique_conn_7", "nodoOrigenId": "boutique_t4", "nodoDestinoId": "boutique_t5"},
                {"_id": "boutique_conn_8", "nodoOrigenId": "boutique_t5", "nodoDestinoId": "boutique_fin"}
            ]
        },
        # 2. Farmacia
        {
            "nombre": "Farmacia",
            "tipoSolicitud": "FARMACIA",
            "nodos": [
                {"_id": "farmacia_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "farmacia_t1", "nombre": "Revisar Inventario y Lotes", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 2},
                {"_id": "farmacia_gateway", "nombre": "¿Falta stock o caduca pronto?", "tipo": "DECISION", "orden": 3},
                {"_id": "farmacia_t2", "nombre": "Solicitar Fármacos Faltantes", "tipo": "TAREA", "departamentoId": "COMPRAS", "orden": 4},
                {"_id": "farmacia_t3", "nombre": "Aprobar Pago a Proveedor", "tipo": "TAREA", "departamentoId": "FINANZAS", "orden": 5},
                {"_id": "farmacia_t4", "nombre": "Registrar Ingreso de Lotes", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 6},
                {"_id": "farmacia_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 7}
            ],
            "conexiones": [
                {"_id": "farmacia_conn_1", "nodoOrigenId": "farmacia_inicio", "nodoDestinoId": "farmacia_t1"},
                {"_id": "farmacia_conn_2", "nodoOrigenId": "farmacia_t1", "nodoDestinoId": "farmacia_gateway"},
                {"_id": "farmacia_conn_3", "nodoOrigenId": "farmacia_gateway", "nodoDestinoId": "farmacia_t2", "etiqueta": "Requiere compra", "condicion": "Sí"},
                {"_id": "farmacia_conn_4", "nodoOrigenId": "farmacia_t2", "nodoDestinoId": "farmacia_t3"},
                {"_id": "farmacia_conn_5", "nodoOrigenId": "farmacia_t3", "nodoDestinoId": "farmacia_t4"},
                {"_id": "farmacia_conn_6", "nodoOrigenId": "farmacia_t4", "nodoDestinoId": "farmacia_fin"},
                {"_id": "farmacia_conn_7", "nodoOrigenId": "farmacia_gateway", "nodoDestinoId": "farmacia_fin", "etiqueta": "Todo al día", "condicion": "No"}
            ]
        },
        # 3. Miniempresa - Caja Chica
        {
            "nombre": "Miniempresa - Caja Chica",
            "tipoSolicitud": "MINIEMPRESA",
            "nodos": [
                {"_id": "cajachica_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "cajachica_t1", "nombre": "Registrar Gastos Menores", "tipo": "TAREA", "departamentoId": "CONTABILIDAD", "orden": 2},
                {"_id": "cajachica_t2", "nombre": "Verificar Facturas y Recibos", "tipo": "TAREA", "departamentoId": "CONTABILIDAD", "orden": 3},
                {"_id": "cajachica_gateway", "nombre": "¿Monto > Límite?", "tipo": "DECISION", "orden": 4},
                {"_id": "cajachica_t3", "nombre": "Aprobación Extraordinaria", "tipo": "TAREA", "departamentoId": "FINANZAS", "orden": 5},
                {"_id": "cajachica_t4", "nombre": "Efectuar Pago de Reposición", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 6},
                {"_id": "cajachica_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 7}
            ],
            "conexiones": [
                {"_id": "cajachica_conn_1", "nodoOrigenId": "cajachica_inicio", "nodoDestinoId": "cajachica_t1"},
                {"_id": "cajachica_conn_2", "nodoOrigenId": "cajachica_t1", "nodoDestinoId": "cajachica_t2"},
                {"_id": "cajachica_conn_3", "nodoOrigenId": "cajachica_t2", "nodoDestinoId": "cajachica_gateway"},
                {"_id": "cajachica_conn_4", "nodoOrigenId": "cajachica_gateway", "nodoDestinoId": "cajachica_t3", "etiqueta": "Sí, requiere aprobación", "condicion": "Sí"},
                {"_id": "cajachica_conn_5", "nodoOrigenId": "cajachica_t3", "nodoDestinoId": "cajachica_t4"},
                {"_id": "cajachica_conn_6", "nodoOrigenId": "cajachica_gateway", "nodoDestinoId": "cajachica_t4", "etiqueta": "No, desembolso directo", "condicion": "No"},
                {"_id": "cajachica_conn_7", "nodoOrigenId": "cajachica_t4", "nodoDestinoId": "cajachica_fin"}
            ]
        },
        # 4. Soporte Técnico de Redes
        {
            "nombre": "Soporte Técnico de Redes",
            "tipoSolicitud": "SOPORTE_TI",
            "nodos": [
                {"_id": "soporte_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "soporte_t1", "nombre": "Clasificar Incidente de Red", "tipo": "TAREA", "departamentoId": "ATENCION_CLIENTE", "orden": 2},
                {"_id": "soporte_t2", "nombre": "Diagnosticar Falla Técnica", "tipo": "TAREA", "departamentoId": "SISTEMAS", "orden": 3},
                {"_id": "soporte_gateway", "nombre": "¿Gravedad Alta?", "tipo": "DECISION", "orden": 4},
                {"_id": "soporte_t3", "nombre": "Asignar Especialista Senior", "tipo": "TAREA", "departamentoId": "SOPORTE", "orden": 5},
                {"_id": "soporte_t4", "nombre": "Resolver Falla en Sitio", "tipo": "TAREA", "departamentoId": "SOPORTE", "orden": 6},
                {"_id": "soporte_t5", "nombre": "Soporte Remoto Básico", "tipo": "TAREA", "departamentoId": "SISTEMAS", "orden": 7},
                {"_id": "soporte_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 8}
            ],
            "conexiones": [
                {"_id": "soporte_conn_1", "nodoOrigenId": "soporte_inicio", "nodoDestinoId": "soporte_t1"},
                {"_id": "soporte_conn_2", "nodoOrigenId": "soporte_t1", "nodoDestinoId": "soporte_t2"},
                {"_id": "soporte_conn_3", "nodoOrigenId": "soporte_t2", "nodoDestinoId": "soporte_gateway"},
                {"_id": "soporte_conn_4", "nodoOrigenId": "soporte_gateway", "nodoDestinoId": "soporte_t3", "etiqueta": "Gravedad Alta", "condicion": "Alta"},
                {"_id": "soporte_conn_5", "nodoOrigenId": "soporte_t3", "nodoDestinoId": "soporte_t4"},
                {"_id": "soporte_conn_6", "nodoOrigenId": "soporte_t4", "nodoDestinoId": "soporte_fin"},
                {"_id": "soporte_conn_7", "nodoOrigenId": "soporte_gateway", "nodoDestinoId": "soporte_t5", "etiqueta": "Gravedad Baja", "condicion": "Baja"},
                {"_id": "soporte_conn_8", "nodoOrigenId": "soporte_t5", "nodoDestinoId": "soporte_fin"}
            ]
        },
        # 5. Aprobación de Descuentos
        {
            "nombre": "Aprobación de Descuentos",
            "tipoSolicitud": "DESCUENTOS",
            "nodos": [
                {"_id": "desc_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "desc_t1", "nombre": "Registrar Solicitud Especial", "tipo": "TAREA", "departamentoId": "VENTAS", "orden": 2},
                {"_id": "desc_t2", "nombre": "Evaluar Margen de Ganancia", "tipo": "TAREA", "departamentoId": "FINANZAS", "orden": 3},
                {"_id": "desc_gateway", "nombre": "¿Descuento > 20%?", "tipo": "DECISION", "orden": 4},
                {"_id": "desc_t3", "nombre": "Autorizar Descuento de Director", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 5},
                {"_id": "desc_t4", "nombre": "Aplicar Descuento y Notificar", "tipo": "TAREA", "departamentoId": "VENTAS", "orden": 6},
                {"_id": "desc_t5", "nombre": "Notificar Rechazo", "tipo": "TAREA", "departamentoId": "VENTAS", "orden": 7},
                {"_id": "desc_fin_aprobado", "nombre": "Descuento Aplicado", "tipo": "FIN", "orden": 8},
                {"_id": "desc_fin_rechazado", "nombre": "Solicitud Rechazada", "tipo": "FIN", "orden": 9}
            ],
            "conexiones": [
                {"_id": "desc_conn_1", "nodoOrigenId": "desc_inicio", "nodoDestinoId": "desc_t1"},
                {"_id": "desc_conn_2", "nodoOrigenId": "desc_t1", "nodoDestinoId": "desc_t2"},
                {"_id": "desc_conn_3", "nodoOrigenId": "desc_t2", "nodoDestinoId": "desc_gateway"},
                {"_id": "desc_conn_4", "nodoOrigenId": "desc_gateway", "nodoDestinoId": "desc_t3", "etiqueta": "Sí, especial", "condicion": "Sí"},
                {"_id": "desc_conn_5", "nodoOrigenId": "desc_gateway", "nodoDestinoId": "desc_t4", "etiqueta": "No, estándar", "condicion": "No"},
                {"_id": "desc_conn_6", "nodoOrigenId": "desc_t3", "nodoDestinoId": "desc_t4", "etiqueta": "Aprobado", "condicion": "Aprobado"},
                {"_id": "desc_conn_7", "nodoOrigenId": "desc_t3", "nodoDestinoId": "desc_t5", "etiqueta": "Rechazado", "condicion": "Rechazado"},
                {"_id": "desc_conn_8", "nodoOrigenId": "desc_t4", "nodoDestinoId": "desc_fin_aprobado"},
                {"_id": "desc_conn_9", "nodoOrigenId": "desc_t5", "nodoDestinoId": "desc_fin_rechazado"}
            ]
        },
        # 6. Despacho de Mercadería
        {
            "nombre": "Despacho de Mercadería",
            "tipoSolicitud": "LOGISTICA",
            "nodos": [
                {"_id": "despacho_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "despacho_t1", "nombre": "Verificar Picking de Productos", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 2},
                {"_id": "despacho_t2", "nombre": "Embalar y Rotular Cajas", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 3},
                {"_id": "despacho_gateway", "nombre": "¿Calidad Aprobada?", "tipo": "DECISION", "orden": 4},
                {"_id": "despacho_t3", "nombre": "Asignar Ruta y Transportista", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 5},
                {"_id": "despacho_t4", "nombre": "Emitir Guía de Remisión", "tipo": "TAREA", "departamentoId": "FACTURACION", "orden": 6},
                {"_id": "despacho_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 7}
            ],
            "conexiones": [
                {"_id": "despacho_conn_1", "nodoOrigenId": "despacho_inicio", "nodoDestinoId": "despacho_t1"},
                {"_id": "despacho_conn_2", "nodoOrigenId": "despacho_t1", "nodoDestinoId": "despacho_t2"},
                {"_id": "despacho_conn_3", "nodoOrigenId": "despacho_t2", "nodoDestinoId": "despacho_gateway"},
                {"_id": "despacho_conn_4", "nodoOrigenId": "despacho_gateway", "nodoDestinoId": "despacho_t1", "etiqueta": "Rechazado por daño", "condicion": "No"},
                {"_id": "despacho_conn_5", "nodoOrigenId": "despacho_gateway", "nodoDestinoId": "despacho_t3", "etiqueta": "Calidad OK", "condicion": "Sí"},
                {"_id": "despacho_conn_6", "nodoOrigenId": "despacho_t3", "nodoDestinoId": "despacho_t4"},
                {"_id": "despacho_conn_7", "nodoOrigenId": "despacho_t4", "nodoDestinoId": "despacho_fin"}
            ]
        },
        # 7. Solicitud de Vacaciones
        {
            "nombre": "Solicitud de Vacaciones",
            "tipoSolicitud": "VACACIONES",
            "nodos": [
                {"_id": "vac_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "vac_t1", "nombre": "Registrar Fechas y Días", "tipo": "TAREA", "departamentoId": "RECURSOS_HUMANOS", "orden": 2},
                {"_id": "vac_t2", "nombre": "Validar con Jefe de Área", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 3},
                {"_id": "vac_gateway", "nombre": "¿Solicitud Aprobada?", "tipo": "DECISION", "orden": 4},
                {"_id": "vac_t3", "nombre": "Procesar en Planilla de RRHH", "tipo": "TAREA", "departamentoId": "RECURSOS_HUMANOS", "orden": 5},
                {"_id": "vac_t4", "nombre": "Ajustar Saldos y Bonos", "tipo": "TAREA", "departamentoId": "FINANZAS", "orden": 6},
                {"_id": "vac_t5", "nombre": "Notificar Rechazo de Vacaciones", "tipo": "TAREA", "departamentoId": "RECURSOS_HUMANOS", "orden": 7},
                {"_id": "vac_fin_aprobado", "nombre": "Vacaciones Autorizadas", "tipo": "FIN", "orden": 8},
                {"_id": "vac_fin_rechazado", "nombre": "Solicitud Rechazada", "tipo": "FIN", "orden": 9}
            ],
            "conexiones": [
                {"_id": "vac_conn_1", "nodoOrigenId": "vac_inicio", "nodoDestinoId": "vac_t1"},
                {"_id": "vac_conn_2", "nodoOrigenId": "vac_t1", "nodoDestinoId": "vac_t2"},
                {"_id": "vac_conn_3", "nodoOrigenId": "vac_t2", "nodoDestinoId": "vac_gateway"},
                {"_id": "vac_conn_4", "nodoOrigenId": "vac_gateway", "nodoDestinoId": "vac_t3", "etiqueta": "Aprobada", "condicion": "Sí"},
                {"_id": "vac_conn_5", "nodoOrigenId": "vac_gateway", "nodoDestinoId": "vac_t5", "etiqueta": "Rechazada", "condicion": "No"},
                {"_id": "vac_conn_6", "nodoOrigenId": "vac_t3", "nodoDestinoId": "vac_t4"},
                {"_id": "vac_conn_7", "nodoOrigenId": "vac_t4", "nodoDestinoId": "vac_fin_aprobado"},
                {"_id": "vac_conn_8", "nodoOrigenId": "vac_t5", "nodoDestinoId": "vac_fin_rechazado"}
            ]
        },
        # 8. Adquisición de Insumos
        {
            "nombre": "Adquisición de Insumos",
            "tipoSolicitud": "COMPRAS",
            "nodos": [
                {"_id": "ins_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "ins_t1", "nombre": "Evaluar Proveedores y Precios", "tipo": "TAREA", "departamentoId": "COMPRAS", "orden": 2},
                {"_id": "ins_gateway", "nombre": "¿Dentro del Presupuesto?", "tipo": "DECISION", "orden": 3},
                {"_id": "ins_t2", "nombre": "Generar Orden de Compra", "tipo": "TAREA", "departamentoId": "COMPRAS", "orden": 4},
                {"_id": "ins_t3", "nombre": "Verificar Ingreso de Insumos", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 5},
                {"_id": "ins_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 6}
            ],
            "conexiones": [
                {"_id": "ins_conn_1", "nodoOrigenId": "ins_inicio", "nodoDestinoId": "ins_t1"},
                {"_id": "ins_conn_2", "nodoOrigenId": "ins_t1", "nodoDestinoId": "ins_gateway"},
                {"_id": "ins_conn_3", "nodoOrigenId": "ins_gateway", "nodoDestinoId": "ins_t1", "etiqueta": "Excede presupuesto", "condicion": "No"},
                {"_id": "ins_conn_4", "nodoOrigenId": "ins_gateway", "nodoDestinoId": "ins_t2", "etiqueta": "Presupuesto OK", "condicion": "Sí"},
                {"_id": "ins_conn_5", "nodoOrigenId": "ins_t2", "nodoDestinoId": "ins_t3"},
                {"_id": "ins_conn_6", "nodoOrigenId": "ins_t3", "nodoDestinoId": "ins_fin"}
            ]
        },
        # 9. Cobranza de Cartera Vencida
        {
            "nombre": "Cobranza de Cartera Vencida",
            "tipoSolicitud": "COBRANZAS",
            "nodos": [
                {"_id": "cob_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "cob_t1", "nombre": "Analizar Antigüedad de Deuda", "tipo": "TAREA", "departamentoId": "COBRANZAS", "orden": 2},
                {"_id": "cob_t2", "nombre": "Enviar Notificación Preventiva", "tipo": "TAREA", "departamentoId": "COBRANZAS", "orden": 3},
                {"_id": "cob_gateway", "nombre": "¿Responde Cliente?", "tipo": "DECISION", "orden": 4},
                {"_id": "cob_t3", "nombre": "Firmar Convenio de Pago", "tipo": "TAREA", "departamentoId": "FINANZAS", "orden": 5},
                {"_id": "cob_t4", "nombre": "Iniciar Acción Judicial", "tipo": "TAREA", "departamentoId": "LEGAL", "orden": 6},
                {"_id": "cob_t5", "nombre": "Registrar Demanda y Embargo", "tipo": "TAREA", "departamentoId": "LEGAL", "orden": 7},
                {"_id": "cob_fin_convenio", "nombre": "Cartera Regularizada", "tipo": "FIN", "orden": 8},
                {"_id": "cob_fin_judicial", "nombre": "Expediente Judicializado", "tipo": "FIN", "orden": 9}
            ],
            "conexiones": [
                {"_id": "cob_conn_1", "nodoOrigenId": "cob_inicio", "nodoDestinoId": "cob_t1"},
                {"_id": "cob_conn_2", "nodoOrigenId": "cob_t1", "nodoDestinoId": "cob_t2"},
                {"_id": "cob_conn_3", "nodoOrigenId": "cob_t2", "nodoDestinoId": "cob_gateway"},
                {"_id": "cob_conn_4", "nodoOrigenId": "cob_gateway", "nodoDestinoId": "cob_t3", "etiqueta": "Sí, acuerdo", "condicion": "Sí"},
                {"_id": "cob_conn_5", "nodoOrigenId": "cob_gateway", "nodoDestinoId": "cob_t4", "etiqueta": "No responde", "condicion": "No"},
                {"_id": "cob_conn_6", "nodoOrigenId": "cob_t3", "nodoDestinoId": "cob_fin_convenio"},
                {"_id": "cob_conn_7", "nodoOrigenId": "cob_t4", "nodoDestinoId": "cob_t5"},
                {"_id": "cob_conn_8", "nodoOrigenId": "cob_t5", "nodoDestinoId": "cob_fin_judicial"}
            ]
        },
        # 10. Revisión de Contratos
        {
            "nombre": "Revisión de Contratos",
            "tipoSolicitud": "CONTRATOS",
            "nodos": [
                {"_id": "con_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "con_t1", "nombre": "Elaborar Borrador", "tipo": "TAREA", "departamentoId": "LEGAL", "orden": 2},
                {"_id": "con_t2", "nombre": "Revisión de Cláusulas Legales", "tipo": "TAREA", "departamentoId": "LEGAL", "orden": 3},
                {"_id": "con_gateway", "nombre": "¿Hay Observaciones?", "tipo": "DECISION", "orden": 4},
                {"_id": "con_t3", "nombre": "Ajustar Detalles del Borrador", "tipo": "TAREA", "departamentoId": "LEGAL", "orden": 5},
                {"_id": "con_t4", "nombre": "Firma de Partes y Archivo", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 6},
                {"_id": "con_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 7}
            ],
            "conexiones": [
                {"_id": "con_conn_1", "nodoOrigenId": "con_inicio", "nodoDestinoId": "con_t1"},
                {"_id": "con_conn_2", "nodoOrigenId": "con_t1", "nodoDestinoId": "con_t2"},
                {"_id": "con_conn_3", "nodoOrigenId": "con_t2", "nodoDestinoId": "con_gateway"},
                {"_id": "con_conn_4", "nodoOrigenId": "con_gateway", "nodoDestinoId": "con_t3", "etiqueta": "Con observaciones", "condicion": "Sí"},
                {"_id": "con_conn_5", "nodoOrigenId": "con_t3", "nodoDestinoId": "con_t2", "etiqueta": "Contrato ajustado", "condicion": "Revisar"},
                {"_id": "con_conn_6", "nodoOrigenId": "con_gateway", "nodoDestinoId": "con_t4", "etiqueta": "Sin observaciones", "condicion": "No"},
                {"_id": "con_conn_7", "nodoOrigenId": "con_t4", "nodoDestinoId": "con_fin"}
            ]
        },
        # 11. Inscripción Escolar
        {
            "nombre": "Inscripción Escolar",
            "tipoSolicitud": "COLEGIO",
            "nodos": [
                {"_id": "col_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "col_t1", "nombre": "Recepcionar Documentos de Alumno", "tipo": "TAREA", "departamentoId": "ATENCION_CLIENTE", "orden": 2},
                {"_id": "col_t2", "nombre": "Evaluar Requisitos y Antecedentes", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 3},
                {"_id": "col_gateway", "nombre": "¿Admitido?", "tipo": "DECISION", "orden": 4},
                {"_id": "col_t3", "nombre": "Cobrar Matrícula y Cuota Inicial", "tipo": "TAREA", "departamentoId": "CONTABILIDAD", "orden": 5},
                {"_id": "col_t4", "nombre": "Registrar en Sistema Académico", "tipo": "TAREA", "departamentoId": "ATENCION_CLIENTE", "orden": 6},
                {"_id": "col_t5", "nombre": "Notificar Rechazo de Matrícula", "tipo": "TAREA", "departamentoId": "ATENCION_CLIENTE", "orden": 7},
                {"_id": "col_fin_inscrito", "nombre": "Inscripción Formalizada", "tipo": "FIN", "orden": 8},
                {"_id": "col_fin_rechazado", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 9}
            ],
            "conexiones": [
                {"_id": "col_conn_1", "nodoOrigenId": "col_inicio", "nodoDestinoId": "col_t1"},
                {"_id": "col_conn_2", "nodoOrigenId": "col_t1", "nodoDestinoId": "col_t2"},
                {"_id": "col_conn_3", "nodoOrigenId": "col_t2", "nodoDestinoId": "col_gateway"},
                {"_id": "col_conn_4", "nodoOrigenId": "col_gateway", "nodoDestinoId": "col_t3", "etiqueta": "Aceptado", "condicion": "Sí"},
                {"_id": "col_conn_5", "nodoOrigenId": "col_gateway", "nodoDestinoId": "col_t5", "etiqueta": "Rechazado", "condicion": "No"},
                {"_id": "col_conn_6", "nodoOrigenId": "col_t3", "nodoDestinoId": "col_t4"},
                {"_id": "col_conn_7", "nodoOrigenId": "col_t4", "nodoDestinoId": "col_fin_inscrito"},
                {"_id": "col_conn_8", "nodoOrigenId": "col_t5", "nodoDestinoId": "col_fin_rechazado"}
            ]
        },
        # 12. Reserva de Viajes
        {
            "nombre": "Reserva de Viajes",
            "tipoSolicitud": "TURISMO",
            "nodos": [
                {"_id": "tur_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "tur_t1", "nombre": "Validar Disponibilidad", "tipo": "TAREA", "departamentoId": "VENTAS", "orden": 2},
                {"_id": "tur_gateway", "nombre": "¿Disponibilidad OK?", "tipo": "DECISION", "orden": 3},
                {"_id": "tur_t2", "nombre": "Sugerir Alternativas de Ruta", "tipo": "TAREA", "departamentoId": "VENTAS", "orden": 4},
                {"_id": "tur_t3", "nombre": "Reservar Vuelos y Hoteles", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 5},
                {"_id": "tur_t4", "nombre": "Cobrar e Imprimir Vouchers", "tipo": "TAREA", "departamentoId": "FINANZAS", "orden": 6},
                {"_id": "tur_t5", "nombre": "Enviar Documentación de Viaje", "tipo": "TAREA", "departamentoId": "VENTAS", "orden": 7},
                {"_id": "tur_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 8}
            ],
            "conexiones": [
                {"_id": "tur_conn_1", "nodoOrigenId": "tur_inicio", "nodoDestinoId": "tur_t1"},
                {"_id": "tur_conn_2", "nodoOrigenId": "tur_t1", "nodoDestinoId": "tur_gateway"},
                {"_id": "tur_conn_3", "nodoOrigenId": "tur_gateway", "nodoDestinoId": "tur_t2", "etiqueta": "No hay cupos", "condicion": "No"},
                {"_id": "tur_conn_4", "nodoOrigenId": "tur_t2", "nodoDestinoId": "tur_t1", "etiqueta": "Ajustar fecha", "condicion": "Reintentar"},
                {"_id": "tur_conn_5", "nodoOrigenId": "tur_gateway", "nodoDestinoId": "tur_t3", "etiqueta": "Disponible", "condicion": "Sí"},
                {"_id": "tur_conn_6", "nodoOrigenId": "tur_t3", "nodoDestinoId": "tur_t4"},
                {"_id": "tur_conn_7", "nodoOrigenId": "tur_t4", "nodoDestinoId": "tur_t5"},
                {"_id": "tur_conn_8", "nodoOrigenId": "tur_t5", "nodoDestinoId": "tur_fin"}
            ]
        },
        # 13. Mantenimiento Vehicular
        {
            "nombre": "Mantenimiento Vehicular",
            "tipoSolicitud": "TALLER",
            "nodos": [
                {"_id": "tal_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "tal_t1", "nombre": "Inspección y Diagnóstico Técnico", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 2},
                {"_id": "tal_t2", "nombre": "Cotizar Repuestos Necesarios", "tipo": "TAREA", "departamentoId": "COMPRAS", "orden": 3},
                {"_id": "tal_gateway", "nombre": "¿Cliente Aprueba Presupuesto?", "tipo": "DECISION", "orden": 4},
                {"_id": "tal_t3", "nombre": "Ejecutar Trabajos del Taller", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 5},
                {"_id": "tal_t4", "nombre": "Control de Calidad y Lavado", "tipo": "TAREA", "departamentoId": "FACTURACION", "orden": 6},
                {"_id": "tal_t5", "nombre": "Devolver Vehículo sin Trabajos", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 7},
                {"_id": "tal_fin_reparado", "nombre": "Vehículo Entregado Reparado", "tipo": "FIN", "orden": 8},
                {"_id": "tal_fin_devuelto", "nombre": "Vehículo Devuelto Original", "tipo": "FIN", "orden": 9}
            ],
            "conexiones": [
                {"_id": "tal_conn_1", "nodoOrigenId": "tal_inicio", "nodoDestinoId": "tal_t1"},
                {"_id": "tal_conn_2", "nodoOrigenId": "tal_t1", "nodoDestinoId": "tal_t2"},
                {"_id": "tal_conn_3", "nodoOrigenId": "tal_t2", "nodoDestinoId": "tal_gateway"},
                {"_id": "tal_conn_4", "nodoOrigenId": "tal_gateway", "nodoDestinoId": "tal_t3", "etiqueta": "Presupuesto Aprobado", "condicion": "Sí"},
                {"_id": "tal_conn_5", "nodoOrigenId": "tal_gateway", "nodoDestinoId": "tal_t5", "etiqueta": "Presupuesto Rechazado", "condicion": "No"},
                {"_id": "tal_conn_6", "nodoOrigenId": "tal_t3", "nodoDestinoId": "tal_t4"},
                {"_id": "tal_conn_7", "nodoOrigenId": "tal_t4", "nodoDestinoId": "tal_fin_reparado"},
                {"_id": "tal_conn_8", "nodoOrigenId": "tal_t5", "nodoDestinoId": "tal_fin_devuelto"}
            ]
        },
        # 14. Membresía de Gimnasio
        {
            "nombre": "Membresía de Gimnasio",
            "tipoSolicitud": "GIMNASIO",
            "nodos": [
                {"_id": "gim_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "gim_t1", "nombre": "Registrar Datos y Ficha Médica", "tipo": "TAREA", "departamentoId": "ATENCION_CLIENTE", "orden": 2},
                {"_id": "gim_t2", "nombre": "Cobrar Plan Anual/Mensual", "tipo": "TAREA", "departamentoId": "FINANZAS", "orden": 3},
                {"_id": "gim_t3", "nombre": "Emitir Carnet de Acceso", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 4},
                {"_id": "gim_gateway", "nombre": "¿Requiere Inducción?", "tipo": "DECISION", "orden": 5},
                {"_id": "gim_t4", "nombre": "Asignar Instructor e Inducción", "tipo": "TAREA", "departamentoId": "ATENCION_CLIENTE", "orden": 6},
                {"_id": "gim_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 7}
            ],
            "conexiones": [
                {"_id": "gim_conn_1", "nodoOrigenId": "gim_inicio", "nodoDestinoId": "gim_t1"},
                {"_id": "gim_conn_2", "nodoOrigenId": "gim_t1", "nodoDestinoId": "gim_t2"},
                {"_id": "gim_conn_3", "nodoOrigenId": "gim_t2", "nodoDestinoId": "gim_t3"},
                {"_id": "gim_conn_4", "nodoOrigenId": "gim_t3", "nodoDestinoId": "gim_gateway"},
                {"_id": "gim_conn_5", "nodoOrigenId": "gim_gateway", "nodoDestinoId": "gim_t4", "etiqueta": "Sí, solicita", "condicion": "Sí"},
                {"_id": "gim_conn_6", "nodoOrigenId": "gim_gateway", "nodoDestinoId": "gim_fin", "etiqueta": "No, directo", "condicion": "No"},
                {"_id": "gim_conn_7", "nodoOrigenId": "gim_t4", "nodoDestinoId": "gim_fin"}
            ]
        },
        # 15. Clínica Veterinaria
        {
            "nombre": "Clínica Veterinaria",
            "tipoSolicitud": "VETERINARIA",
            "nodos": [
                {"_id": "vet_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "vet_t1", "nombre": "Atención Primaria y Triaje", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 2},
                {"_id": "vet_gateway", "nombre": "¿Es Urgencia Quirúrgica?", "tipo": "DECISION", "orden": 3},
                {"_id": "vet_t2", "nombre": "Operación Quirúrgica", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 4},
                {"_id": "vet_t3", "nombre": "Internación y Recuperación", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 5},
                {"_id": "vet_t4", "nombre": "Consulta Médica General", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 6},
                {"_id": "vet_t5", "nombre": "Liquidación de Servicios y Caja", "tipo": "TAREA", "departamentoId": "FACTURACION", "orden": 7},
                {"_id": "vet_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 8}
            ],
            "conexiones": [
                {"_id": "vet_conn_1", "nodoOrigenId": "vet_inicio", "nodoDestinoId": "vet_t1"},
                {"_id": "vet_conn_2", "nodoOrigenId": "vet_t1", "nodoDestinoId": "vet_gateway"},
                {"_id": "vet_conn_3", "nodoOrigenId": "vet_gateway", "nodoDestinoId": "vet_t2", "etiqueta": "Es Emergencia", "condicion": "Sí"},
                {"_id": "vet_conn_4", "nodoOrigenId": "vet_gateway", "nodoDestinoId": "vet_t4", "etiqueta": "Consulta Normal", "condicion": "No"},
                {"_id": "vet_conn_5", "nodoOrigenId": "vet_t2", "nodoDestinoId": "vet_t3"},
                {"_id": "vet_conn_6", "nodoOrigenId": "vet_t3", "nodoDestinoId": "vet_t5"},
                {"_id": "vet_conn_7", "nodoOrigenId": "vet_t4", "nodoDestinoId": "vet_t5"},
                {"_id": "vet_conn_8", "nodoOrigenId": "vet_t5", "nodoDestinoId": "vet_fin"}
            ]
        },
        # 16. Desaduanización de Importaciones
        {
            "nombre": "Desaduanización de Importaciones",
            "tipoSolicitud": "IMPORTACIONES",
            "nodos": [
                {"_id": "imp_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "imp_t1", "nombre": "Verificar Manifiesto de Carga", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 2},
                {"_id": "imp_gateway", "nombre": "¿Documentos Completos?", "tipo": "DECISION", "orden": 3},
                {"_id": "imp_t2", "nombre": "Solicitar Corrección de Invoice", "tipo": "TAREA", "departamentoId": "LEGAL", "orden": 4},
                {"_id": "imp_t3", "nombre": "Calcular Gravamen y Liquidar", "tipo": "TAREA", "departamentoId": "FINANZAS", "orden": 5},
                {"_id": "imp_t4", "nombre": "Autorizar Retiro de Almacén", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 6},
                {"_id": "imp_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 7}
            ],
            "conexiones": [
                {"_id": "imp_conn_1", "nodoOrigenId": "imp_inicio", "nodoDestinoId": "imp_t1"},
                {"_id": "imp_conn_2", "nodoOrigenId": "imp_t1", "nodoDestinoId": "imp_gateway"},
                {"_id": "imp_conn_3", "nodoOrigenId": "imp_gateway", "nodoDestinoId": "imp_t2", "etiqueta": "Incompleto/Error", "condicion": "No"},
                {"_id": "imp_conn_4", "nodoOrigenId": "imp_t2", "nodoDestinoId": "imp_t1", "etiqueta": "Invoice corregida", "condicion": "Corregido"},
                {"_id": "imp_conn_5", "nodoOrigenId": "imp_gateway", "nodoDestinoId": "imp_t3", "etiqueta": "Todo Completo", "condicion": "Sí"},
                {"_id": "imp_conn_6", "nodoOrigenId": "imp_t3", "nodoDestinoId": "imp_t4"},
                {"_id": "imp_conn_7", "nodoOrigenId": "imp_t4", "nodoDestinoId": "imp_fin"}
            ]
        },
        # 17. Courier y Envíos
        {
            "nombre": "Courier y Envíos",
            "tipoSolicitud": "COURIER",
            "nodos": [
                {"_id": "cou_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "cou_t1", "nombre": "Verificar Peso y Tarifa", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 2},
                {"_id": "cou_gateway", "nombre": "¿Envío Internacional?", "tipo": "DECISION", "orden": 3},
                {"_id": "cou_t2", "nombre": "Trámite Aduanal y Aduanas", "tipo": "TAREA", "departamentoId": "LEGAL", "orden": 4},
                {"_id": "cou_t3", "nombre": "Despachar a Hub de Tránsito", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 5},
                {"_id": "cou_t4", "nombre": "Entregar a Courier Local", "tipo": "TAREA", "departamentoId": "LOGISTICA", "orden": 6},
                {"_id": "cou_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 7}
            ],
            "conexiones": [
                {"_id": "cou_conn_1", "nodoOrigenId": "cou_inicio", "nodoDestinoId": "cou_t1"},
                {"_id": "cou_conn_2", "nodoOrigenId": "cou_t1", "nodoDestinoId": "cou_gateway"},
                {"_id": "cou_conn_3", "nodoOrigenId": "cou_gateway", "nodoDestinoId": "cou_t2", "etiqueta": "Internacional", "condicion": "Sí"},
                {"_id": "cou_conn_4", "nodoOrigenId": "cou_gateway", "nodoDestinoId": "cou_t3", "etiqueta": "Nacional directo", "condicion": "No"},
                {"_id": "cou_conn_5", "nodoOrigenId": "cou_t2", "nodoDestinoId": "cou_t3"},
                {"_id": "cou_conn_6", "nodoOrigenId": "cou_t3", "nodoDestinoId": "cou_t4"},
                {"_id": "cou_conn_7", "nodoOrigenId": "cou_t4", "nodoDestinoId": "cou_fin"}
            ]
        },
        # 18. Organización de Eventos
        {
            "nombre": "Organización de Eventos",
            "tipoSolicitud": "EVENTOS",
            "nodos": [
                {"_id": "eve_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "eve_t1", "nombre": "Reunión de Briefing inicial", "tipo": "TAREA", "departamentoId": "MARKETING", "orden": 2},
                {"_id": "eve_t2", "nombre": "Elaborar Propuesta Creativa", "tipo": "TAREA", "departamentoId": "MARKETING", "orden": 3},
                {"_id": "eve_gateway", "nombre": "¿Cliente Aprueba Diseño?", "tipo": "DECISION", "orden": 4},
                {"_id": "eve_t3", "nombre": "Contratar Catering y Luces", "tipo": "TAREA", "departamentoId": "COMPRAS", "orden": 5},
                {"_id": "eve_t4", "nombre": "Supervisar Montaje y Ejecución", "tipo": "TAREA", "departamentoId": "MARKETING", "orden": 6},
                {"_id": "eve_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 7}
            ],
            "conexiones": [
                {"_id": "eve_conn_1", "nodoOrigenId": "eve_inicio", "nodoDestinoId": "eve_t1"},
                {"_id": "eve_conn_2", "nodoOrigenId": "eve_t1", "nodoDestinoId": "eve_t2"},
                {"_id": "eve_conn_3", "nodoOrigenId": "eve_t2", "nodoDestinoId": "eve_gateway"},
                {"_id": "eve_conn_4", "nodoOrigenId": "eve_gateway", "nodoDestinoId": "eve_t2", "etiqueta": "Modificar propuesta", "condicion": "No"},
                {"_id": "eve_conn_5", "nodoOrigenId": "eve_gateway", "nodoDestinoId": "eve_t3", "etiqueta": "Propuesta aprobada", "condicion": "Sí"},
                {"_id": "eve_conn_6", "nodoOrigenId": "eve_t3", "nodoDestinoId": "eve_t4"},
                {"_id": "eve_conn_7", "nodoOrigenId": "eve_t4", "nodoDestinoId": "eve_fin"}
            ]
        },
        # 19. Aprobación de Microcréditos
        {
            "nombre": "Aprobación de Microcréditos",
            "tipoSolicitud": "CREDITOS",
            "nodos": [
                {"_id": "cre_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "cre_t1", "nombre": "Evaluar Historial Crediticio", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 2},
                {"_id": "cre_gateway", "nombre": "¿Apto por Scoring?", "tipo": "DECISION", "orden": 3},
                {"_id": "cre_t2", "nombre": "Auditar Garantías y Riesgos", "tipo": "TAREA", "departamentoId": "AUDITORIA", "orden": 4},
                {"_id": "cre_t3", "nombre": "Desembolsar Fondos a Cliente", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 5},
                {"_id": "cre_t4", "nombre": "Notificar Rechazo de Crédito", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 6},
                {"_id": "cre_fin_desembolso", "nombre": "Crédito Desembolsado", "tipo": "FIN", "orden": 7},
                {"_id": "cre_fin_rechazado", "nombre": "Solicitud Denegada", "tipo": "FIN", "orden": 8}
            ],
            "conexiones": [
                {"_id": "cre_conn_1", "nodoOrigenId": "cre_inicio", "nodoDestinoId": "cre_t1"},
                {"_id": "cre_conn_2", "nodoOrigenId": "cre_t1", "nodoDestinoId": "cre_gateway"},
                {"_id": "cre_conn_3", "nodoOrigenId": "cre_gateway", "nodoDestinoId": "cre_t2", "etiqueta": "Scoring Aprobado", "condicion": "Sí"},
                {"_id": "cre_conn_4", "nodoOrigenId": "cre_gateway", "nodoDestinoId": "cre_t4", "etiqueta": "Scoring Insuficiente", "condicion": "No"},
                {"_id": "cre_conn_5", "nodoOrigenId": "cre_t2", "nodoDestinoId": "cre_t3"},
                {"_id": "cre_conn_6", "nodoOrigenId": "cre_t3", "nodoDestinoId": "cre_fin_desembolso"},
                {"_id": "cre_conn_7", "nodoOrigenId": "cre_t4", "nodoDestinoId": "cre_fin_rechazado"}
            ]
        },
        # 20. Impresiones a Medida
        {
            "nombre": "Impresiones a Medida",
            "tipoSolicitud": "IMPRENTA",
            "nodos": [
                {"_id": "imp_inicio", "nombre": "Inicio de Trámite", "tipo": "INICIO", "orden": 1},
                {"_id": "imp_t1", "nombre": "Cotizar Formato y Materiales", "tipo": "TAREA", "departamentoId": "VENTAS", "orden": 2},
                {"_id": "imp_t2", "nombre": "Revisar y Adecuar Archivo PDF", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 3},
                {"_id": "imp_gateway", "nombre": "¿Resolución PDF Correcta?", "tipo": "DECISION", "orden": 4},
                {"_id": "imp_t3", "nombre": "Imprenta y Acabados de Planchas", "tipo": "TAREA", "departamentoId": "OPERACIONES", "orden": 5},
                {"_id": "imp_t4", "nombre": "Control de Calidad y Empaque", "tipo": "TAREA", "departamentoId": "FACTURACION", "orden": 6},
                {"_id": "imp_fin", "nombre": "Trámite Concluido", "tipo": "FIN", "orden": 7}
            ],
            "conexiones": [
                {"_id": "imp_conn_1", "nodoOrigenId": "imp_inicio", "nodoDestinoId": "imp_t1"},
                {"_id": "imp_conn_2", "nodoOrigenId": "imp_t1", "nodoDestinoId": "imp_t2"},
                {"_id": "imp_conn_3", "nodoOrigenId": "imp_t2", "nodoDestinoId": "imp_gateway"},
                {"_id": "imp_conn_4", "nodoOrigenId": "imp_gateway", "nodoDestinoId": "imp_t1", "etiqueta": "Re-solicitar PDF", "condicion": "No"},
                {"_id": "imp_conn_5", "nodoOrigenId": "imp_gateway", "nodoDestinoId": "imp_t3", "etiqueta": "PDF Excelente", "condicion": "Sí"},
                {"_id": "imp_conn_6", "nodoOrigenId": "imp_t3", "nodoDestinoId": "imp_t4"},
                {"_id": "imp_conn_7", "nodoOrigenId": "imp_t4", "nodoDestinoId": "imp_fin"}
            ]
        }
    ]

    plantillas_db = []
    for index, p_data in enumerate(plantillas_info, start=1):
        nombre = p_data["nombre"]
        tipo_sol = p_data["tipoSolicitud"]
        nodes = p_data["nodos"]
        edges = p_data["conexiones"]
        
        # Agregar rolRequerido y otros valores necesarios a los nodos tipo TAREA
        for nd in nodes:
            if nd["tipo"] == "TAREA":
                nd["rolRequerido"] = "funcionario"
                nd["requiereEvidencia"] = False
                nd["tiempoLimiteHoras"] = 24
            elif nd["tipo"] in ["INICIO", "FIN", "DECISION", "PARALELO"]:
                nd["requiereEvidencia"] = False
                nd["tiempoLimiteHoras"] = 0
        
        plantilla = {
            "_id": ObjectId(f"69e31b831f470c234de982{index:02d}"),
            "nombre": nombre,
            "tipoSolicitud": tipo_sol,
            "version": 1,
            "estado": "BORRADOR",
            "createdBy": "admin",
            "nodos": nodes,
            "conexiones": edges,
            "bpmnXml": None,
            "esSeeder": True,
            "createdAt": fecha_inicio_sistema,
            "_class": "com.examensw1.backend.modules.workflow.domain.Workflow"
        }
        plantillas_db.append(plantilla)

    db["proceso_templates"].insert_many(plantillas_db)
    print(f"Sembradas {len(plantillas_db)} plantillas en estado BORRADOR en MongoDB.")
    print(f"Sembradas {len(plantillas_db)} plantillas en estado BORRADOR en MongoDB.")

    # 7. Obtener la plantilla activa 'TRAMITE' para vincular los procesos reales (Evita romper Camunda)
    template_real = db["proceso_templates"].find_one({"nombre": "TRAMITE"})
    if template_real:
        template_id = str(template_real["_id"])
        print(f"Trámites del seeder vinculados a la plantilla activa real: 'TRAMITE' (ID: {template_id})")
    else:
        template_id = "69e31b831f470c234de982e3"
        print(f"Plantilla 'TRAMITE' activa no encontrada en BD. Usando fallback de ID: {template_id}")

    # 8. Sembrar 20 Trámites (Instancias de Proceso) vinculados a la plantilla activa
    print("Sembrando 20 instancias de trámites...")
    instancias_db = []
    ids_instancias = [ObjectId() for _ in range(20)]
    
    # Aseguramos el trámite de Laura Gomez del 25 de mayo de 2026
    inst_laura_id = ids_instancias[0]
    instancia_laura = {
        "_id": inst_laura_id,
        "codigo": "TRM-SEED-004",
        "templateId": template_id,
        "clienteId": str(cli_laura_id),
        "estadoActual": "COMPLETADO",
        "prioridad": "NORMAL",
        "responsableActualId": usr_legal_id,
        "esSeeder": True,
        "createdAt": datetime.datetime(2026, 5, 25, 12, 0, 0),
        "updatedAt": datetime.datetime(2026, 5, 25, 18, 0, 0),
        "finishedAt": datetime.datetime(2026, 5, 25, 18, 0, 0),
        "_class": "com.examensw1.backend.modules.workflow.domain.ProcesoInstancia"
    }
    instancias_db.append(instancia_laura)

    estados_tramites = ["ATRASADO", "EN_PROGRESO", "COMPLETADO", "NUEVO"]

    for i in range(1, 20):
        c_id = clientes_db[i % len(clientes_db)]["_id"]
        f_id = funcionarios_db[i % len(funcionarios_db)]["_id"]
        estado = estados_tramites[i % len(estados_tramites)]
        
        # Forzar que un trámite atrasado (ATRASADO) sea asignado al departamento LEGAL para pruebas
        if i == 4:
            f_id = usr_legal_id
        
        factor_fecha = i / 19.0
        fecha_creacion = fecha_inicio_sistema + datetime.timedelta(seconds=int(delta_total.total_seconds() * factor_fecha))
        
        inst = {
            "_id": ids_instancias[i],
            "codigo": f"TRM-SEED-{i+4:03d}",
            "templateId": template_id,
            "clienteId": str(c_id),
            "estadoActual": estado,
            "prioridad": random.choice(["ALTA", "NORMAL", "BAJA"]),
            "responsableActualId": f_id,
            "esSeeder": True,
            "createdAt": fecha_creacion,
            "updatedAt": fecha_creacion + datetime.timedelta(days=1),
            "_class": "com.examensw1.backend.modules.workflow.domain.ProcesoInstancia"
        }
        
        if estado == "COMPLETADO":
            inst["finishedAt"] = fecha_creacion + datetime.timedelta(days=3)
            
        instancias_db.append(inst)

    db["proceso_instancias"].insert_many(instancias_db)
    print(f"Sembrados {len(instancias_db)} trámites en MongoDB.")

    # 9. Sembrar 30 Tareas de prueba (con estados: PENDIENTE, EN_PROGRESO, COMPLETADO)
    print("Sembrando 30 tareas...")
    tareas_db = []

    # Tarea de Laura (Seeder)
    tarea_laura = {
        "_id": "TASK_SEED_004",
        "procesoInstanciaId": str(inst_laura_id),
        "procesoInstanciaCodigo": "TRM-SEED-004",
        "nodoId": "NODO_SOL_LEGAL",
        "nombre": "Revisar contrato de Laura",
        "tipo": "REVISION",
        "estado": "COMPLETADO",
        "usuarioAsignadoId": usr_legal_id,
        "requiereEvidencia": False,
        "fechaInicio": datetime.datetime(2026, 5, 25, 12, 0, 0),
        "fechaLimite": datetime.datetime(2026, 5, 25, 17, 0, 0),
        "fechaCompletado": datetime.datetime(2026, 5, 25, 17, 0, 0),
        "esSeeder": True,
        "createdAt": datetime.datetime(2026, 5, 25, 12, 0, 0),
        "_class": "com.examensw1.backend.modules.task.domain.Task"
    }
    tareas_db.append(tarea_laura)

    estados_tareas = ["PENDIENTE", "EN_PROGRESO", "COMPLETADO"]

    for i in range(1, 30):
        inst_vinculada = instancias_db[i % len(instancias_db)]
        f_id = funcionarios_db[i % len(funcionarios_db)]["_id"]
        estado_t = estados_tareas[i % len(estados_tareas)]
        
        fecha_t_inicio = inst_vinculada["createdAt"] + datetime.timedelta(hours=2)
        
        # Simular fecha límite. Si es atrasada, la fecha limite ya pasó respecto a hoy
        if i % 3 == 0:  # Vencida/Atrasada
            fecha_t_limite = fecha_t_inicio + datetime.timedelta(days=2)
            # Forzar a que esté vencida haciendo que su fecha de inicio y limite sean lejanas en el pasado
            if fecha_t_limite > fecha_hoy:
                fecha_t_limite = fecha_hoy - datetime.timedelta(days=1)
        else:
            fecha_t_limite = fecha_hoy + datetime.timedelta(days=5)

        tarea = {
            "_id": f"TASK_SEED_{i+4:03d}",
            "procesoInstanciaId": str(inst_vinculada["_id"]),
            "procesoInstanciaCodigo": inst_vinculada["codigo"],
            "nodoId": f"NODO_{i}",
            "nombre": f"Gestión de nodo {i}",
            "tipo": "REVISION",
            "estado": estado_t,
            "usuarioAsignadoId": f_id,
            "requiereEvidencia": False,
            "fechaInicio": fecha_t_inicio,
            "fechaLimite": fecha_t_limite,
            "esSeeder": True,
            "createdAt": fecha_t_inicio,
            "_class": "com.examensw1.backend.modules.task.domain.Task"
        }

        if estado_t == "COMPLETADO":
            tarea["fechaCompletado"] = fecha_t_inicio + datetime.timedelta(hours=4)

        tareas_db.append(tarea)

    db["tareas"].insert_many(tareas_db)
    print(f"Sembradas {len(tareas_db)} tareas en MongoDB.")

    print("\n¡Sembrado de datos masivo completado con éxito en MongoDB!")

if __name__ == "__main__":
    sembrar_datos()
