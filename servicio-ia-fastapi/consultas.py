import datetime
from bson import ObjectId
from database import get_database

def serializar_mongo(doc):
    """
    Convierte recursivamente tipos de datos de MongoDB (ObjectId, datetime) 
    a tipos serializables en JSON (cadenas de texto).
    """
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serializar_mongo(item) for item in doc]
    if isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if k == "_id":
                new_doc["id"] = str(v)
            elif isinstance(v, ObjectId):
                new_doc[k] = str(v)
            elif isinstance(v, datetime.datetime):
                new_doc[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                new_doc[k] = serializar_mongo(v)
            else:
                new_doc[k] = v
        return new_doc
    return doc

async def obtener_datos_reporte(
    categoria: str, 
    criterio: str, 
    departamento: str = None, 
    rango_fecha: tuple = None, 
    nombre: str = None, 
    kpi: str = None
):
    db = get_database()
    ahora = datetime.datetime.utcnow()
    
    # Pre-filtrar KPIs analíticos globales que no dependen de una sola colección
    if kpi == "mas_activo" and (categoria == "clientes" or categoria == "tramites"):
        # Pipeline para encontrar el cliente con más trámites
        pipeline = [
            {"$match": {"clienteId": {"$nin": [None, "", "null"]}}},
            {"$group": {"_id": "$clienteId", "total_tramites": {"$sum": 1}}},
            {"$sort": {"total_tramites": -1}},
            {"$limit": 1}
        ]
        cursor_agg = db["proceso_instancias"].aggregate(pipeline)
        result_agg = await cursor_agg.to_list(length=1)
        
        if result_agg:
            top_client_id = result_agg[0]["_id"]
            total_tramites = result_agg[0]["total_tramites"]
            cliente_nombre = "Desconocido"
            if top_client_id:
                try:
                    cliente = await db["clientes"].find_one({"_id": ObjectId(top_client_id)})
                    if not cliente:
                        cliente = await db["clientes"].find_one({"_id": top_client_id})
                    if cliente:
                        cliente_nombre = f"{cliente.get('nombre', '')} {cliente.get('apellido', '')}".strip()
                except Exception:
                    cliente_nombre = str(top_client_id)
            return [{
                "Métrica": "Cliente más activo (Mayor número de trámites)",
                "Nombre Cliente": cliente_nombre,
                "Total de Trámites": total_tramites
            }]
        return [{"Métrica": "Cliente más activo", "Resultado": "No se encontraron trámites registrados"}]
        
    elif kpi == "mas_activo" and categoria == "usuarios":
        # Pipeline para encontrar el funcionario con más trámites asignados
        pipeline = [
            {"$match": {"responsableActualId": {"$nin": [None, "", "null"]}}},
            {"$group": {"_id": "$responsableActualId", "total_tramites": {"$sum": 1}}},
            {"$sort": {"total_tramites": -1}},
            {"$limit": 1}
        ]
        cursor_agg = db["proceso_instancias"].aggregate(pipeline)
        result_agg = await cursor_agg.to_list(length=1)
        
        if result_agg:
            top_usr_id = result_agg[0]["_id"]
            total_tramites = result_agg[0]["total_tramites"]
            usr_nombre = "Desconocido"
            if top_usr_id:
                try:
                    usr = await db["usuarios"].find_one({"_id": top_usr_id})
                    if not usr:
                        usr = await db["usuarios"].find_one({"_id": ObjectId(top_usr_id)})
                    if usr:
                        usr_nombre = f"{usr.get('nombre', '')} {usr.get('apellido', '')}".strip()
                except Exception:
                    usr_nombre = str(top_usr_id)
            return [{
                "Métrica": "Funcionario más activo (Mayor cantidad de trámites asignados)",
                "Funcionario": usr_nombre,
                "Total de Trámites": total_tramites
            }]
        return [{"Métrica": "Funcionario más activo", "Resultado": "No se encontraron trámites asignados"}]

    # 1. REPORTES DE TRÁMITES (proceso_instancias)
    if categoria == "tramites":
        coleccion = db["proceso_instancias"]
        filtro = {}
        if departamento:
            # Buscar usuarios pertenecientes a ese departamento
            usr_cursor = db["usuarios"].find({"departamentoId": departamento})
            usrs = await usr_cursor.to_list(length=100)
            usr_ids = [str(u["_id"]) for u in usrs] + [u["_id"] for u in usrs]
            
            filtro["$or"] = [
                {"nodoActual.departamentoId": departamento},
                {"responsableActualId": {"$in": usr_ids}}
            ]
            
        if rango_fecha:
            start_dt = datetime.datetime.fromisoformat(rango_fecha[0])
            end_dt = datetime.datetime.fromisoformat(rango_fecha[1])
            filtro["createdAt"] = {"$gte": start_dt, "$lte": end_dt}
            
        if nombre:
            usr_cursor = db["usuarios"].find({
                "$or": [
                    {"nombre": {"$regex": nombre, "$options": "i"}},
                    {"apellido": {"$regex": nombre, "$options": "i"}}
                ]
            })
            usrs = await usr_cursor.to_list(length=10)
            usr_ids = [str(u["_id"]) for u in usrs] + [u["_id"] for u in usrs]
            
            cli_cursor = db["clientes"].find({
                "$or": [
                    {"nombre": {"$regex": nombre, "$options": "i"}},
                    {"apellido": {"$regex": nombre, "$options": "i"}}
                ]
            })
            clis = await cli_cursor.to_list(length=10)
            cli_ids = [str(c["_id"]) for c in clis] + [c["_id"] for c in clis]
            
            filtro["$or"] = [
                {"responsableActualId": {"$in": usr_ids}},
                {"clienteId": {"$in": cli_ids}},
                {"clienteNombre": {"$regex": nombre, "$options": "i"}}
            ]
            
        if criterio == "atrasados":
            filtro["estadoActual"] = {"$in": ["DEMORADO", "ATRASADO", "VENCIDO"]}
        elif criterio == "pendientes":
            filtro["estadoActual"] = {"$in": ["NUEVO", "EN_PROGRESO", "EN_PROCESO", "PENDIENTE"]}
        elif criterio == "completados":
            filtro["estadoActual"] = {"$in": ["COMPLETADO", "FINALIZADO", "APROBADO"]}
            
        if kpi == "conteo":
            total = await coleccion.count_documents(filtro)
            return [{
                "Métrica": "Cantidad total de Trámites",
                "Cantidad": total,
                "Filtro Aplicado": criterio.capitalize() if criterio != "todos" else "Sin filtro"
            }]
        
        cursor = coleccion.find(filtro)
        documentos = await cursor.to_list(length=100)
        
        for doc in documentos:
            if "clienteId" in doc and doc["clienteId"]:
                try:
                    cliente = await db["clientes"].find_one({"_id": doc["clienteId"]})
                    if not cliente:
                        cliente = await db["clientes"].find_one({"_id": ObjectId(doc["clienteId"])})
                    if cliente:
                        doc["clienteNombre"] = f"{cliente.get('nombre', '')} {cliente.get('apellido', '')}".strip()
                except Exception:
                    pass
        return serializar_mongo(documentos)
        
    # 2. REPORTES DE DOCUMENTOS (archivos)
    elif categoria == "documentos":
        coleccion = db["archivos"]
        filtro = {}
        
        if rango_fecha:
            start_dt = datetime.datetime.fromisoformat(rango_fecha[0])
            end_dt = datetime.datetime.fromisoformat(rango_fecha[1])
            filtro["createdAt"] = {"$gte": start_dt, "$lte": end_dt}
            
        if nombre:
            filtro["nombreArchivo"] = {"$regex": nombre, "$options": "i"}
        
        if criterio == "atrasados":
            tareas_atrasadas_cursor = db["tareas"].find({
                "estado": {"$in": ["PENDIENTE", "EN_PROGRESO"]},
                "fechaLimite": {"$lt": ahora}
            })
            tareas_atrasadas = await tareas_atrasadas_cursor.to_list(length=100)
            ids_tareas = [t["_id"] for t in tareas_atrasadas] + [str(t["_id"]) for t in tareas_atrasadas]
            
            instancias_atrasadas_cursor = db["proceso_instancias"].find({
                "estadoActual": {"$in": ["DEMORADO", "ATRASADO", "VENCIDO"]}
            })
            instancias_atrasadas = await instancias_atrasadas_cursor.to_list(length=100)
            ids_instancias = [inst["_id"] for inst in instancias_atrasadas] + [str(inst["_id"]) for inst in instancias_atrasadas] + [inst.get("codigo") for inst in instancias_atrasadas if inst.get("codigo")]
            
            filtro.update({
                "$or": [
                    {"tareaId": {"$in": ids_tareas}},
                    {"procesoInstanciaId": {"$in": ids_instancias}}
                ]
            })
            
        elif criterio == "pendientes":
            tareas_pendientes_cursor = db["tareas"].find({
                "estado": {"$in": ["PENDIENTE", "EN_PROGRESO"]}
            })
            tareas_pendientes = await tareas_pendientes_cursor.to_list(length=100)
            ids_tareas = [t["_id"] for t in tareas_pendientes] + [str(t["_id"]) for t in tareas_pendientes]
            
            filtro.update({
                "$or": [
                    {"esEvidencia": True},
                    {"tareaId": {"$in": ids_tareas}}
                ]
            })
            
        elif criterio == "completados":
            tareas_completas_cursor = db["tareas"].find({
                "estado": {"$in": ["COMPLETADO", "COMPLETADA"]}
            })
            tareas_completas = await tareas_completas_cursor.to_list(length=100)
            ids_tareas = [t["_id"] for t in tareas_completas] + [str(t["_id"]) for t in tareas_completas]
            
            filtro.update({
                "$or": [
                    {"esEvidencia": False},
                    {"tareaId": {"$in": ids_tareas}}
                ]
            })
            
        if kpi == "conteo":
            total = await coleccion.count_documents(filtro)
            return [{
                "Métrica": "Cantidad total de Documentos",
                "Cantidad": total,
                "Filtro Aplicado": criterio.capitalize() if criterio != "todos" else "Sin filtro"
            }]
            
        cursor = coleccion.find(filtro)
        documentos = await cursor.to_list(length=100)
        return serializar_mongo(documentos)
        
    # 3. REPORTES DE USUARIOS / FUNCIONARIOS (usuarios)
    elif categoria == "usuarios":
        coleccion = db["usuarios"]
        filtro = {}
        if departamento:
            filtro["departamentoId"] = departamento
            
        if rango_fecha:
            start_dt = datetime.datetime.fromisoformat(rango_fecha[0])
            end_dt = datetime.datetime.fromisoformat(rango_fecha[1])
            filtro["createdAt"] = {"$gte": start_dt, "$lte": end_dt}
            
        if nombre:
            filtro["$or"] = [
                {"nombre": {"$regex": nombre, "$options": "i"}},
                {"apellido": {"$regex": nombre, "$options": "i"}},
                {"username": {"$regex": nombre, "$options": "i"}}
            ]
        
        if criterio == "atrasados":
            tareas_atrasadas_cursor = db["tareas"].find({
                "estado": {"$in": ["PENDIENTE", "EN_PROGRESO"]},
                "fechaLimite": {"$lt": ahora}
            })
            tareas_atrasadas = await tareas_atrasadas_cursor.to_list(length=100)
            ids_usuarios_atrasados = list(set([t.get("usuarioAsignadoId") for t in tareas_atrasadas if t.get("usuarioAsignadoId")]))
            
            filtro["_id"] = {"$in": ids_usuarios_atrasados + [ObjectId(uid) for uid in ids_usuarios_atrasados if ObjectId.is_valid(uid)]}
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
        elif criterio == "pendientes":
            tareas_pendientes_cursor = db["tareas"].find({
                "estado": {"$in": ["PENDIENTE", "EN_PROGRESO"]}
            })
            tareas_pendientes = await tareas_pendientes_cursor.to_list(length=100)
            ids_usuarios_pendientes = list(set([t.get("usuarioAsignadoId") for t in tareas_pendientes if t.get("usuarioAsignadoId")]))
            
            filtro["activo"] = True
            filtro["_id"] = {"$in": ids_usuarios_pendientes + [ObjectId(uid) for uid in ids_usuarios_pendientes if ObjectId.is_valid(uid)]}
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
        elif criterio == "completados":
            filtro["activo"] = True
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
        else:
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
            
        if kpi == "conteo":
            total = await coleccion.count_documents(filtro)
            return [{
                "Métrica": "Cantidad total de Usuarios/Funcionarios",
                "Cantidad": total,
                "Filtro Aplicado": criterio.capitalize() if criterio != "todos" else "Sin filtro"
            }]
            
        return serializar_mongo(documentos)
        
    # 4. REPORTES DE CLIENTES (clientes)
    elif categoria == "clientes":
        coleccion = db["clientes"]
        filtro = {}
        
        if rango_fecha:
            start_dt = datetime.datetime.fromisoformat(rango_fecha[0])
            end_dt = datetime.datetime.fromisoformat(rango_fecha[1])
            filtro["createdAt"] = {"$gte": start_dt, "$lte": end_dt}
            
        if nombre:
            filtro["$or"] = [
                {"nombre": {"$regex": nombre, "$options": "i"}},
                {"apellido": {"$regex": nombre, "$options": "i"}}
            ]
        
        if criterio == "atrasados":
            instancias_cursor = db["proceso_instancias"].find({
                "estadoActual": {"$in": ["DEMORADO", "ATRASADO", "VENCIDO"]}
            })
            instancias = await instancias_cursor.to_list(length=100)
            ids_clientes = list(set([inst.get("clienteId") for inst in instancias if inst.get("clienteId")]))
            
            filtro["_id"] = {"$in": ids_clientes + [ObjectId(cid) for cid in ids_clientes if ObjectId.is_valid(cid)]}
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
        elif criterio == "pendientes":
            instancias_cursor = db["proceso_instancias"].find({
                "estadoActual": {"$in": ["NUEVO", "EN_PROGRESO", "EN_PROCESO", "PENDIENTE"]}
            })
            instancias = await instancias_cursor.to_list(length=100)
            ids_clientes = list(set([inst.get("clienteId") for inst in instancias if inst.get("clienteId")]))
            
            filtro["_id"] = {"$in": ids_clientes + [ObjectId(cid) for cid in ids_clientes if ObjectId.is_valid(cid)]}
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
        elif criterio == "completados":
            instancias_cursor = db["proceso_instancias"].find({
                "estadoActual": {"$in": ["COMPLETADO", "FINALIZADO", "APROBADO"]}
            })
            instancias = await instancias_cursor.to_list(length=100)
            ids_clientes = list(set([inst.get("clienteId") for inst in instancias if inst.get("clienteId")]))
            
            filtro["_id"] = {"$in": ids_clientes + [ObjectId(cid) for cid in ids_clientes if ObjectId.is_valid(cid)]}
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
        else:
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
            
        if kpi == "conteo":
            total = await coleccion.count_documents(filtro)
            return [{
                "Métrica": "Cantidad total de Clientes",
                "Cantidad": total,
                "Filtro Aplicado": criterio.capitalize() if criterio != "todos" else "Sin filtro"
            }]
            
        return serializar_mongo(documentos)
        
    # 5. REPORTES DE POLÍTICAS DE NEGOCIO (proceso_templates)
    elif categoria == "politicas":
        coleccion = db["proceso_templates"]
        filtro = {}
        
        if rango_fecha:
            start_dt = datetime.datetime.fromisoformat(rango_fecha[0])
            end_dt = datetime.datetime.fromisoformat(rango_fecha[1])
            filtro["createdAt"] = {"$gte": start_dt, "$lte": end_dt}
            
        if nombre:
            filtro["nombre"] = {"$regex": nombre, "$options": "i"}
        
        if criterio == "atrasados":
            instancias_cursor = db["proceso_instancias"].find({
                "estadoActual": {"$in": ["DEMORADO", "ATRASADO", "VENCIDO"]}
            })
            instancias = await instancias_cursor.to_list(length=100)
            ids_templates = list(set([inst.get("templateId") for inst in instancias if inst.get("templateId")]))
            
            filtro["_id"] = {"$in": ids_templates + [ObjectId(tid) for tid in ids_templates if ObjectId.is_valid(tid)]}
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
        elif criterio == "pendientes":
            filtro["estado"] = "BORRADOR"
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
        elif criterio == "completados":
            filtro["estado"] = {"$in": ["ACTIVO", "PUBLICADO"]}
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
        else:
            cursor = coleccion.find(filtro)
            documentos = await cursor.to_list(length=100)
            
        if kpi == "conteo":
            total = await coleccion.count_documents(filtro)
            return [{
                "Métrica": "Cantidad total de Políticas de Negocio",
                "Cantidad": total,
                "Filtro Aplicado": criterio.capitalize() if criterio != "todos" else "Sin filtro"
            }]
            
        return serializar_mongo(documentos)
        
    # Fallback si la categoría no es reconocida
    return []

async def obtener_metricas_cuello_botella(template_id: str = None):
    db = get_database()

    # 1. Encontrar los IDs de instancia correspondientes al template (si se especifica)
    inst_ids = []
    inst_codigos = []
    
    if template_id:
        filtro_instancias = {}
        t_ids = [template_id]
        if ObjectId.is_valid(template_id):
            t_ids.append(ObjectId(template_id))
        filtro_instancias["templateId"] = {"$in": t_ids}
        
        cursor_instancias = db["proceso_instancias"].find(filtro_instancias, {"_id": 1, "codigo": 1})
        instancias = await cursor_instancias.to_list(length=5000)
        
        inst_ids = [str(i["_id"]) for i in instancias] + [i["_id"] for i in instancias]
        inst_codigos = [i["codigo"] for i in instancias if i.get("codigo")]

    # 2. Filtrar tareas
    filtro_tareas = {}
    if template_id:
        filtro_tareas["$or"] = [
            {"procesoInstanciaId": {"$in": inst_ids}},
            {"procesoInstanciaCodigo": {"$in": inst_codigos}}
        ]

    cursor_tareas = db["tareas"].find(filtro_tareas)
    tareas = await cursor_tareas.to_list(length=10000)

    # 3. Procesar métricas en memoria
    nodos_stats = {}
    ahora = datetime.datetime.utcnow()

    for t in tareas:
        nodo_key = t.get("nodoId") or t.get("nombre") or "Desconocido"
        nombre = t.get("nombre") or "Tarea sin nombre"
        depto = t.get("departamentoAsignadoId") or "Sin Asignar"
        
        # Limpiar/Traducir nombres comunes de departamentos
        if depto == "dep-002": depto = "INGENIERIA"
        elif depto == "dep-003": depto = "COBRANZAS"
        elif depto == "dep-004": depto = "LOGISTICA"
        elif depto == "dep-005": depto = "SUPERVISION"
        
        if nodo_key not in nodos_stats:
            nodos_stats[nodo_key] = {
                "nombre": nombre,
                "departamento": depto,
                "pendientes": 0,
                "atrasadas": 0,
                "tiempos_ejecucion": [],
                "tiempos_limite": []
            }
        
        stats = nodos_stats[nodo_key]
        estado = t.get("estado", "")

        # Contar tareas activas y verificar si están atrasadas
        if estado in ["PENDIENTE", "EN_PROGRESO", "EN_PROCESO"]:
            stats["pendientes"] += 1
            fecha_limite = t.get("fechaLimite")
            if isinstance(fecha_limite, str):
                try:
                    fecha_limite = datetime.datetime.fromisoformat(fecha_limite)
                except Exception:
                    fecha_limite = None
            if fecha_limite and fecha_limite < ahora:
                stats["atrasadas"] += 1

        # Calcular tiempo de ejecución para tareas completadas
        elif estado in ["COMPLETADO", "COMPLETADA", "APROBADO"]:
            fecha_inicio = t.get("fechaInicio") or t.get("createdAt")
            fecha_fin = t.get("fechaCompletado")
            
            if isinstance(fecha_inicio, str):
                try: fecha_inicio = datetime.datetime.fromisoformat(fecha_inicio)
                except Exception: fecha_inicio = None
            if isinstance(fecha_fin, str):
                try: fecha_fin = datetime.datetime.fromisoformat(fecha_fin)
                except Exception: fecha_fin = None

            if fecha_inicio and fecha_fin:
                horas = (fecha_fin - fecha_inicio).total_seconds() / 3600.0
                stats["tiempos_ejecucion"].append(horas)

        # Medir el límite de tiempo asignado
        fecha_inicio = t.get("fechaInicio") or t.get("createdAt")
        fecha_limite = t.get("fechaLimite")
        if isinstance(fecha_inicio, str):
            try: fecha_inicio = datetime.datetime.fromisoformat(fecha_inicio)
            except Exception: fecha_inicio = None
        if isinstance(fecha_limite, str):
            try: fecha_limite = datetime.datetime.fromisoformat(fecha_limite)
            except Exception: fecha_limite = None

        if fecha_inicio and fecha_limite:
            limite = (fecha_limite - fecha_inicio).total_seconds() / 3600.0
            stats["tiempos_limite"].append(limite)

    # 4. Consolidar promedios
    resumen_nodos = []
    for k, v in nodos_stats.items():
        avg_exec = round(sum(v["tiempos_ejecucion"]) / len(v["tiempos_ejecucion"]), 1) if v["tiempos_ejecucion"] else 0.0
        avg_limit = round(sum(v["tiempos_limite"]) / len(v["tiempos_limite"]), 1) if v["tiempos_limite"] else 24.0 # 24 horas por defecto
        
        resumen_nodos.append({
            "nombre": v["nombre"],
            "departamento": v["departamento"],
            "tiempo_promedio_horas": avg_exec,
            "tiempo_limite_horas": avg_limit,
            "pendientes": v["pendientes"],
            "atrasadas": v["atrasadas"]
        })

    # Si no hay nodos, agregar un mockup para evitar prompt vacío en pruebas
    if not resumen_nodos:
        resumen_nodos = [
            {
                "nombre": "Sin Tareas Registradas",
                "departamento": "N/A",
                "tiempo_promedio_horas": 0.0,
                "tiempo_limite_horas": 24.0,
                "pendientes": 0,
                "atrasadas": 0
            }
        ]

    return {"nodos": resumen_nodos}
