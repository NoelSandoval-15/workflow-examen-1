import os
import json
import numpy as np
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

import tensorflow as tf
from tensorflow.keras.preprocessing.text import tokenizer_from_json
from tensorflow.keras.preprocessing.sequence import pad_sequences

from database import close_database
from consultas import obtener_datos_reporte, obtener_metricas_cuello_botella
from reportes import generar_archivo_reporte

import google.generativeai as genai
import os

app = FastAPI(
    title="Asistente IA - Gestión Documental",
    description="Microservicio de Inteligencia Artificial para NLP y Análisis de Riesgo",
    version="1.0.0"
)

# Configurar CORS para permitir que Angular se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción cambiar al dominio de Angular
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas del modelo
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELO_DIR = os.path.join(BASE_DIR, "modelo")
MODELO_PATH = os.path.join(MODELO_DIR, "modelo_reportes_nlp.keras")
TOKENIZER_PATH = os.path.join(MODELO_DIR, "tokenizer.json")
METADATA_PATH = os.path.join(MODELO_DIR, "metadata_nlp.json")

MODELO_CUELLO_BOTELLA_PATH = os.path.join(MODELO_DIR, "modelo_cuello_botella.keras")
METADATA_CUELLO_BOTELLA_PATH = os.path.join(MODELO_DIR, "metadata_cuello_botella.json")

# Variables globales para el modelo
model = None
tokenizer = None
metadata = None

model_cuello_botella = None
metadata_cuello_botella = None

# Evento de inicio para cargar el modelo en memoria
@app.on_event("startup")
def load_nlp_model():
    global model, tokenizer, metadata
    try:
        print("Cargando modelo NLP y recursos...")
        # 1. Cargar metadatos
        if not os.path.exists(METADATA_PATH):
            raise FileNotFoundError("No se encontró metadata_nlp.json")
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        
        # 2. Cargar tokenizador
        if not os.path.exists(TOKENIZER_PATH):
            raise FileNotFoundError("No se encontró tokenizer.json")
        with open(TOKENIZER_PATH, "r", encoding="utf-8") as f:
            tokenizer_data = f.read()
            tokenizer = tokenizer_from_json(tokenizer_data)
            
        # 3. Cargar modelo TensorFlow
        if not os.path.exists(MODELO_PATH):
            raise FileNotFoundError("No se encontró modelo_reportes_nlp.keras")
        model = tf.keras.models.load_model(MODELO_PATH)
        
        print("Modelo NLP y recursos cargados exitosamente.")
    except Exception as e:
        print(f"Error al cargar el modelo NLP: {str(e)}")

@app.on_event("startup")
def load_bottleneck_model():
    global model_cuello_botella, metadata_cuello_botella
    try:
        print("Cargando modelo de cuello de botella...")
        if not os.path.exists(MODELO_CUELLO_BOTELLA_PATH) or not os.path.exists(METADATA_CUELLO_BOTELLA_PATH):
            print("Modelo de cuello de botella no encontrado. Entrenando automáticamente...")
            from entrenamiento.entrenar_cuellos_botella import entrenar_modelo_botella
            entrenar_modelo_botella()
            
        with open(METADATA_CUELLO_BOTELLA_PATH, "r", encoding="utf-8") as f:
            metadata_cuello_botella = json.load(f)
            
        model_cuello_botella = tf.keras.models.load_model(MODELO_CUELLO_BOTELLA_PATH)
        print("Modelo de cuello de botella local cargado exitosamente.")
    except Exception as e:
        print(f"Error al cargar/entrenar el modelo de cuello de botella: {str(e)}")

# Evento de apagado para liberar recursos
@app.on_event("shutdown")
def shutdown_event():
    print("Cerrando conexión a MongoDB...")
    close_database()

# Esquemas de datos con Pydantic
class ConsultaNLP(BaseModel):
    texto: str

@app.get("/")
@app.get("/api/ia")
@app.get("/api/ia/")
def read_root():
    return {
        "message": "Microservicio de IA activo y funcionando",
        "nlp_model_loaded": model is not None
    }

def detectar_departamento(texto: str) -> str:
    """
    Analiza el texto de consulta para detectar palabras clave referentes a departamentos
    y retorna el ID de departamento correspondiente, o None si no se especifica.
    Mapeado a los 15 departamentos del seeder oficial.
    """
    if not texto:
        return None
    t = texto.lower()
    if "legal" in t or "ley" in t or "abogado" in t:
        return "LEGAL"
    elif "finanza" in t or "presupuesto" in t or "contabil" in t:
        if "contabil" in t:
            return "CONTABILIDAD"
        return "FINANZAS"
    elif "atencion al cliente" in t or "atención al cliente" in t or "atencion" in t or "atención" in t or "recepcion" in t or "recepción" in t:
        return "ATENCION_CLIENTE"
    elif "sistema" in t or "tecnologia" in t or "tecnología" in t or "ti" in t:
        palabras = t.split()
        if "sistema" in t or "sistemas" in t or "ti" in palabras:
            return "SISTEMAS"
    elif "operacion" in t or "operaciones" in t or "ejecucion" in t or "ejecución" in t:
        return "OPERACIONES"
    elif "archivo" in t or "documentacion" in t or "documentación" in t:
        return "ARCHIVO"
    elif "cobranza" in t or "cobranzas" in t or "pago" in t or "pagos" in t:
        return "COBRANZAS"
    elif "facturacion" in t or "facturación" in t:
        return "FACTURACION"
    elif "logistica" in t or "logística" in t or "despacho" in t or "almacen" in t or "almacén" in t:
        return "LOGISTICA"
    elif "recursos humanos" in t or "rrhh" in t:
        return "RECURSOS_HUMANOS"
    elif "compras" in t:
        return "COMPRAS"
    elif "ventas" in t:
        return "VENTAS"
    elif "marketing" in t:
        return "MARKETING"
    elif "auditoria" in t or "auditoría" in t:
        return "AUDITORIA"
    elif "soporte" in t:
        return "SOPORTE"
    elif "ofimatica" in t or "ofimática" in t:
        return "69e6599e539a0895dea4f9c2"
    elif "contrato" in t or "contratos" in t:
        return "69e8e9ca6c4384110901c577"
    return None

def detectar_fecha_rango(texto: str) -> tuple:
    """
    Detecta menciones de fechas (meses o días específicos de meses, o rangos de meses) en el texto.
    Retorna una tupla (fecha_inicio, fecha_fin) en formato ISO string, o None.
    """
    if not texto:
        return None
        
    t = texto.lower()
    import datetime
    
    # 0. Detectar "último mes" (rango relativo de 30 días con base al año 2026)
    if "ultimo mes" in t or "último mes" in t:
        hoy = datetime.datetime(2026, 6, 9, 23, 59, 59)
        start = hoy - datetime.timedelta(days=30)
        return (start.isoformat(), hoy.isoformat())
        
    meses = {
        "enero": (1, 31),
        "febrero": (2, 28),
        "marzo": (3, 31),
        "abril": (4, 30),
        "mayo": (5, 31),
        "junio": (6, 30),
        "julio": (7, 31),
        "agosto": (8, 31),
        "septiembre": (9, 30),
        "octubre": (10, 31),
        "noviembre": (11, 30),
        "diciembre": (12, 31)
    }
    
    # 1. Buscar todas las menciones de meses
    meses_detectados = []
    for mes, info in meses.items():
        if mes in t:
            meses_detectados.append((mes, info[0], info[1]))
            
    if not meses_detectados:
        return None
        
    # Ordenar cronológicamente por número de mes para rangos múltiples
    meses_detectados.sort(key=lambda x: x[1])
    year = 2026 # Año base del sistema
    
    # Si hay múltiples meses (ej: "entre enero y marzo")
    if len(meses_detectados) > 1:
        primer_mes = meses_detectados[0]
        ultimo_mes = meses_detectados[-1]
        start = datetime.datetime(year, primer_mes[1], 1, 0, 0, 0)
        end = datetime.datetime(year, ultimo_mes[1], ultimo_mes[2], 23, 59, 59)
        return (start.isoformat(), end.isoformat())
        
    # Si hay solo un mes detectado
    mes_nombre, mes_num, max_dia = meses_detectados[0]
    
    # 2. Buscar si hay un número de día antes o cerca del mes (ej: "25 de mayo")
    import re
    numeros = re.findall(r'\b\d{1,2}\b', t)
    
    if numeros:
        dia_detectado = None
        for num in numeros:
            val = int(num)
            if 1 <= val <= max_dia:
                dia_detectado = val
                break
                
        if dia_detectado is not None:
            start = datetime.datetime(year, mes_num, dia_detectado, 0, 0, 0)
            end = datetime.datetime(year, mes_num, dia_detectado, 23, 59, 59)
            return (start.isoformat(), end.isoformat())
            
    # Rango de todo el mes
    start = datetime.datetime(year, mes_num, 1, 0, 0, 0)
    end = datetime.datetime(year, mes_num, max_dia, 23, 59, 59)
    return (start.isoformat(), end.isoformat())

def detectar_nombre(texto: str) -> str:
    """
    Busca nombres de personas en el texto de la consulta.
    Retorna el nombre si se detecta, o None.
    """
    if not texto:
        return None
    t = texto.lower()
    
    nombres_comunes = ["laura", "juan", "carlos", "maria", "maría", "diego", "ana", "luis", "rosa", "pedro", "erick", "noel", "samir", "roberto", "sandra", "miguel", "carmen", "hector", "héctor", "patricia", "fernando"]
    
    for nombre in nombres_comunes:
        import re
        if re.search(r'\b' + re.escape(nombre) + r'\b', t):
            # Normalizar sin acento para buscar en la BD
            if nombre == "maría":
                return "maria"
            if nombre == "héctor":
                return "hector"
            return nombre
            
    return None

def detectar_kpi(texto: str) -> str:
    """
    Detecta si el usuario pide una métrica agregada/analítica en lugar de una lista plana.
    """
    if not texto:
        return None
    t = texto.lower()
    
    if "mas activo" in t or "más activo" in t or "mas activa" in t or "más activa" in t or "mas frecuente" in t or "más frecuente" in t:
        return "mas_activo"
    elif "numero" in t or "número" in t or "cantidad" in t or "total" in t or "cuantos" in t or "cuántos" in t or "conteo" in t:
        return "conteo"
        
    return None

@app.post("/api/ia/nlp/analizar")
async def analizar_consulta(consulta: ConsultaNLP):
    global model, tokenizer, metadata
    
    if model is None or tokenizer is None or metadata is None:
        raise HTTPException(
            status_code=503,
            detail="El servicio de NLP no se encuentra disponible porque el modelo no se cargó correctamente."
        )
        
    texto = consulta.texto.strip()
    if not texto:
        raise HTTPException(
            status_code=400,
            detail="El texto de consulta no puede estar vacío."
        )
        
    try:
        # Preprocesamiento del texto
        sequences = tokenizer.texts_to_sequences([texto])
        padded = pad_sequences(sequences, maxlen=metadata["max_len"], padding="post", truncating="post")
        
        # Predicción con el modelo ejecutada asíncronamente en un hilo separado
        import asyncio
        loop = asyncio.get_event_loop()
        pred_cat, pred_crit, pred_form = await loop.run_in_executor(None, lambda: model.predict(padded))
        
        # Obtener los índices de mayor probabilidad
        idx_cat = int(np.argmax(pred_cat[0]))
        idx_crit = int(np.argmax(pred_crit[0]))
        idx_form = int(np.argmax(pred_form[0]))
        
        # Obtener la probabilidad de la predicción para control de confianza
        prob_cat = float(pred_cat[0][idx_cat])
        prob_crit = float(pred_crit[0][idx_crit])
        prob_form = float(pred_form[0][idx_form])
        
        # Mapear a etiquetas de texto reales
        categoria_predicha = metadata["categorias"][idx_cat]
        criterio_predicho = metadata["criterios"][idx_crit]
        formato_predicho = metadata["formatos"][idx_form]
        
        # Detectar filtros avanzados del texto
        departamento_detectado = detectar_departamento(texto)
        rango_fecha = detectar_fecha_rango(texto)
        nombre_detectado = detectar_nombre(texto)
        kpi_detectado = detectar_kpi(texto)

        # Heurísticas de corrección (override) para resolver errores de clasificación del modelo NLP
        t = texto.lower()
        if any(w in t for w in ["trámite", "tramite", "trámites", "tramites", "proceso", "procesos", "flujo", "flujos", "caso", "casos"]):
            categoria_predicha = "tramites"
        elif any(w in t for w in ["documento", "documentos", "archivo", "archivos", "fichero", "ficheros", "evidencia", "evidencias"]):
            categoria_predicha = "documentos"
        elif any(w in t for w in ["usuario", "usuarios", "funcionario", "funcionarios", "empleado", "empleados", "personal", "operador", "operadores"]):
            categoria_predicha = "usuarios"
        elif any(w in t for w in ["cliente", "clientes", "solicitante", "solicitantes"]):
            categoria_predicha = "clientes"
        elif any(w in t for w in ["política", "politica", "políticas", "politicas", "regla", "reglas", "plantilla", "plantillas", "template", "templates"]):
            categoria_predicha = "politicas"

        # Los clientes no tienen departamentos asignados. Si se detecta un departamento y la categoría predicha es clientes,
        # se reasigna a tramites (o usuarios si se detectan palabras clave de personal).
        if departamento_detectado and categoria_predicha == "clientes":
            if any(w in t for w in ["usuario", "funcionario", "empleado", "operador"]):
                categoria_predicha = "usuarios"
            else:
                categoria_predicha = "tramites"
        
        # Consultar datos reales de MongoDB aplicando todos los filtros dinámicos
        datos_reales = await obtener_datos_reporte(
            categoria_predicha, 
            criterio_predicho, 
            departamento_detectado,
            rango_fecha,
            nombre_detectado,
            kpi_detectado
        )
        
        # Limpiar y traducir los datos para mostrarlos en el frontend de forma profesional
        from reportes import filtrar_y_traducir_datos
        datos_limpios = filtrar_y_traducir_datos(categoria_predicha, datos_reales)
        
        return {
            "consulta": texto,
            "analisis": {
                "categoria": categoria_predicha,
                "criterio": criterio_predicho,
                "formato": formato_predicho,
                "departamento": departamento_detectado,
                "rango_fecha": rango_fecha,
                "nombre": nombre_detectado,
                "kpi": kpi_detectado
            },
            "confianza": {
                "categoria": round(prob_cat, 4),
                "criterio": round(prob_crit, 4),
                "formato": round(prob_form, 4)
            },
            "datos": datos_limpios
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ocurrió un error al procesar la predicción: {str(e)}"
        )

@app.get("/api/ia/nlp/descargar")
async def descargar_reporte(
    categoria: str, 
    criterio: str, 
    formato: str, 
    departamento: str = None,
    rango_fecha_inicio: str = None,
    rango_fecha_fin: str = None,
    nombre: str = None,
    kpi: str = None
):
    """
    Endpoint para descargar el reporte en formato físico (PDF, Excel, Word) con todos los filtros dinámicos.
    """
    try:
        rango_fecha = None
        if rango_fecha_inicio and rango_fecha_fin:
            rango_fecha = (rango_fecha_inicio, rango_fecha_fin)
            
        # 1. Obtener datos reales de MongoDB aplicando todos los filtros dinámicos
        datos = await obtener_datos_reporte(categoria, criterio, departamento, rango_fecha, nombre, kpi)
        
        # 2. Generar el archivo binario correspondiente
        contenido, mime_type, filename = generar_archivo_reporte(categoria, criterio, formato, datos)
        
        # 3. Retornar la respuesta binaria de archivo
        return Response(
            content=contenido,
            media_type=mime_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el archivo de reporte: {str(e)}"
        )


# Configurar API Key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def predecir_cuellos_botella_local(metricas: dict) -> dict:
    global model_cuello_botella, metadata_cuello_botella
    
    # Cargar/Entrenar en runtime si es necesario como medida de seguridad
    if model_cuello_botella is None:
        try:
            if not os.path.exists(MODELO_CUELLO_BOTELLA_PATH) or not os.path.exists(METADATA_CUELLO_BOTELLA_PATH):
                from entrenamiento.entrenar_cuellos_botella import entrenar_modelo_botella
                entrenar_modelo_botella()
            with open(METADATA_CUELLO_BOTELLA_PATH, "r", encoding="utf-8") as f:
                metadata_cuello_botella = json.load(f)
            model_cuello_botella = tf.keras.models.load_model(MODELO_CUELLO_BOTELLA_PATH)
        except Exception as e:
            print(f"Error al cargar el modelo de cuello de botella en predicción: {e}")
            
    nodos = metricas.get("nodos", [])
    cuellos_botella = []
    max_severidad = 0  # 0: BAJA, 1: MEDIA, 2: ALTA
    
    # Si la lista de nodos está vacía o solo contiene el mockup de "Sin Tareas Registradas", retornamos saludable vacío
    if not nodos or (len(nodos) == 1 and nodos[0].get("nombre") == "Sin Tareas Registradas"):
        return {
            "nivel_alerta_global": "SALUDABLE",
            "cuellos_botella": []
        }
        
    for nd in nodos:
        nombre = nd.get("nombre", "Tarea sin nombre")
        depto = nd.get("departamento", "Sin Asignar")
        avg_horas = float(nd.get("tiempo_promedio_horas", 0.0))
        lim_horas = float(nd.get("tiempo_limite_horas", 24.0))
        pendientes = float(nd.get("pendientes", 0))
        atrasadas = float(nd.get("atrasadas", 0))
        
        ratio_tiempos = avg_horas / (lim_horas + 1e-5)
        ratio_atrasadas = atrasadas / (pendientes + 1e-5)
        
        # Preparar entrada para la red neuronal: 
        # [tiempo_promedio, tiempo_limite, ratio_tiempos, pendientes, atrasadas, ratio_atrasadas]
        input_data = np.array([[avg_horas, lim_horas, ratio_tiempos, pendientes, atrasadas, ratio_atrasadas]], dtype=np.float32)
        
        if model_cuello_botella is not None:
            try:
                preds = model_cuello_botella.predict(input_data, verbose=0)
                idx_pred = int(np.argmax(preds[0]))
            except Exception as e:
                print(f"Error durante inferencia local TF: {e}. Usando fallback lógico.")
                # Fallback por si hay un error en TensorFlow
                if atrasadas >= 3 or ratio_tiempos >= 1.3:
                    idx_pred = 2
                elif atrasadas >= 1 or ratio_tiempos >= 0.8:
                    idx_pred = 1
                else:
                    idx_pred = 0
        else:
            # Fallback por si el modelo no pudo cargarse en absoluto
            if atrasadas >= 3 or ratio_tiempos >= 1.3:
                idx_pred = 2
            elif atrasadas >= 1 or ratio_tiempos >= 0.8:
                idx_pred = 1
            else:
                idx_pred = 0
                
        classes = ["BAJA", "MEDIA", "ALTA"]
        severidad = classes[idx_pred]
        
        if idx_pred > max_severidad:
            max_severidad = idx_pred
            
        # Generar recomendaciones solo para severidades que representen un riesgo (MEDIA y ALTA)
        if idx_pred > 0:
            if idx_pred == 2:
                descripcion = f"El nodo '{nombre}' presenta un retraso crítico. Tiene {int(atrasadas)} tareas demoradas y un tiempo promedio de resolución de {avg_horas:.1f} horas, superando el límite de {lim_horas:.1f} horas."
                sugerencia = f"Se recomienda reasignar tareas urgentemente al equipo de {depto}, optimizar el flujo de aprobaciones de este nodo o añadir personal de apoyo temporal."
            else:
                descripcion = f"El nodo '{nombre}' muestra señales de alerta. Registra {int(atrasadas)} tareas demoradas y un tiempo promedio de resolución de {avg_horas:.1f} horas frente a las {lim_horas:.1f} horas límite."
                sugerencia = f"Monitorear la carga de trabajo en el departamento de {depto} y balancear las asignaciones de tareas activas."
                
            cuellos_botella.append({
                "nodo": nombre,
                "departamento": depto,
                "severidad": severidad,
                "descripcion": descripcion,
                "sugerencia": sugerencia
            })
            
    # Mapeo de nivel global de alerta
    alertas_globales = ["SALUDABLE", "ADVERTENCIA", "CRITICO"]
    nivel_alerta_global = alertas_globales[max_severidad]
    
    return {
        "nivel_alerta_global": nivel_alerta_global,
        "cuellos_botella": cuellos_botella
    }

@app.get("/api/ia/cuellos-botella")
async def analizar_cuellos_botella(templateId: str = None, metodo: str = "cloud"):
    # 1. Obtener métricas calculadas matemáticamente desde consultas.py
    metricas = await obtener_metricas_cuello_botella(templateId)
    
    # 2. Si el método solicitado es local (TensorFlow)
    if metodo == "local":
        analisis_local = await predecir_cuellos_botella_local(metricas)
        return {
            "metricas": metricas,
            "analisis_ia": analisis_local
        }
        
    # 3. Método por defecto: Diagnóstico Inteligente en la Nube (Gemini)
    prompt = f"""
    Analiza las siguientes métricas de rendimiento de nuestros flujos de trabajo en base de datos:
    {metricas}
    
    Identifica cuellos de botella (retrasos, acumulación de tareas pendientes) y para cada uno:
    - Indica severidad (ALTA, MEDIA, BAJA)
    - Describe brevemente el problema
    - Da una recomendación de optimización concreta.
    """
    
    # Llamar a Gemini 3.5 Flash forzando salida JSON estructurada
    model = genai.GenerativeModel("gemini-3.5-flash")
    response = model.generate_content(
        prompt,
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": {
                "type": "OBJECT",
                "properties": {
                    "nivel_alerta_global": {"type": "STRING"}, # CRITICO, ADVERTENCIA, SALUDABLE
                    "cuellos_botella": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "nodo": {"type": "STRING"},
                                "departamento": {"type": "STRING"},
                                "severidad": {"type": "STRING"},
                                "descripcion": {"type": "STRING"},
                                "sugerencia": {"type": "STRING"}
                            }
                        }
                    }
                }
            }
        }
    )
    
    return {
        "metricas": metricas,
        "analisis_ia": json.loads(response.text)
    }

class WorkflowNodeSchema(BaseModel):
    id: str
    nombre: str
    tipo: str
    departamentoId: str | None = None
    tiempoLimiteHoras: int | None = None
    orden: int | None = None

class WorkflowEdgeSchema(BaseModel):
    id: str
    nodoOrigenId: str
    nodoDestinoId: str
    etiqueta: str | None = None
    condicion: str | None = None

class GenerarFlujoRequest(BaseModel):
    prompt: str
    nodos: list[WorkflowNodeSchema] | None = None
    conexiones: list[WorkflowEdgeSchema] | None = None
    nombre_actual: str | None = None
    tipo_solicitud_actual: str | None = None

@app.post("/api/ia/workflow/generate")
async def generar_flujo_workflow(req: GenerarFlujoRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="El prompt no puede estar vacío")
    
    nodos_actuales = [n.dict() for n in req.nodos] if req.nodos else []
    conexiones_actuales = [c.dict() for c in req.conexiones] if req.conexiones else []
    
    prompt_inst = f"""
    Eres un experto en diseño de flujos de trabajo de negocio (BPMN).
    Tu tarea es procesar la orden del usuario: "{req.prompt}"
    
    Tienes acceso al flujo de trabajo actual en el canvas (si existe):
    - Nombre actual del flujo: "{req.nombre_actual or ''}"
    - Tipo de solicitud actual: "{req.tipo_solicitud_actual or ''}"
    - Nodos actuales: {json.dumps(nodos_actuales)}
    - Conexiones actuales: {json.dumps(conexiones_actuales)}
    
    Analiza la orden del usuario y decide si:
    A) El usuario quiere CREAR un flujo completo desde cero (o si la lista de nodos actuales está vacía o solo contiene inicio/fin).
    B) El usuario quiere MODIFICAR, INSERTAR, ELIMINAR, o EDITAR el flujo actual.
    
    Requisitos técnicos obligatorios:
    1. El primer nodo DEBE ser de tipo "INICIO" con id "inicio" y nombre "Inicio".
    2. El último nodo DEBE ser de tipo "FIN" con id "fin" y nombre "Trámite Concluido".
    3. Todos los nodos intermedios deben ser de tipo "TAREA". Para cada tarea intermedia, define a qué departamento responsable pertenece. Elige uno de estos departamentos válidos en mayúsculas: "LEGAL", "FINANZAS", "OPERACIONES", "ARCHIVO", "SISTEMA", "ATENCION_CLIENTE". Si no coincide con ninguno, pon "Sin Asignar".
    4. Los IDs de los nodos intermedios deben ser secuenciales o lógicos (ej: "nodo1", "nodo2", "nodo3", etc. o preservar los IDs actuales si es una modificación).
    
    Si el caso es A (Creación completa):
    - Diseña el flujo completo de acuerdo a la orden.
    - Conecta el nodo "inicio" a "nodo1", "nodo1" a "nodo2"... y el último a "fin".
    - Genera un nombre de flujo sugerido descriptivo y un tipo de solicitud en mayúsculas sin espacios (ej: COMPRA_MEDICAMENTOS).
    
    Si el caso es B (Modificación / Inserción / Eliminación / Edición del flujo actual):
    - Si el usuario pide INSERTAR, AGREGAR o AÑADIR un nodo intermedio (ej: "inserta un nodo de revisión legal"):
      * Identifica dónde tiene sentido colocarlo (normalmente después de un nodo existente y antes de otro, o al final antes de "fin").
      * Crea el nuevo nodo con un ID único como "nodo_nuevo_1" o "nodoX" y el departamento correspondiente.
      * Modifica las conexiones: elimina la conexión directa que unía el nodo anterior con el posterior, y añade dos nuevas conexiones para que pasen a través del nuevo nodo.
    - Si pide ELIMINAR, QUITAR o REMOVER un nodo:
      * Remueve ese nodo de la lista de nodos.
      * Reconecta las conexiones: si habia conexiones de A -> nodo_eliminado y nodo_eliminado -> B, elimínalas y crea una conexión directa de A -> B.
    - Si pide RENOMBRAR, CAMBIAR NOMBRE o EDITAR las propiedades de un nodo:
      * Modifica el nombre o el departamento del nodo con el ID correspondiente en la lista, dejando intactos el resto de nodos y conexiones.
    - Preserva los demás nodos y conexiones tal como estaban, y conserva el nombre del flujo y tipo de solicitud actuales a menos que el usuario pida cambiarlos.
    
    Retorna la respuesta en formato JSON estructurado que siga este esquema:
    """
    
    try:
        model = genai.GenerativeModel("gemini-3.5-flash")
        response = model.generate_content(
            prompt_inst,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "OBJECT",
                    "properties": {
                        "nombre_flujo": {"type": "STRING"},
                        "tipo_solicitud": {"type": "STRING"},
                        "nodos": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "id": {"type": "STRING"},
                                    "nombre": {"type": "STRING"},
                                    "tipo": {"type": "STRING"}, # INICIO, TAREA, DECISION, PARALELO, FIN
                                    "departamentoId": {"type": "STRING"},
                                    "tiempoLimiteHoras": {"type": "INTEGER"},
                                    "orden": {"type": "INTEGER"}
                                },
                                "required": ["id", "nombre", "tipo", "departamentoId", "orden"]
                              }
                          },
                          "conexiones": {
                              "type": "ARRAY",
                              "items": {
                                  "type": "OBJECT",
                                  "properties": {
                                      "id": {"type": "STRING"},
                                      "nodoOrigenId": {"type": "STRING"},
                                      "nodoDestinoId": {"type": "STRING"},
                                      "etiqueta": {"type": "STRING"},
                                      "condicion": {"type": "STRING"}
                                  },
                                  "required": ["id", "nodoOrigenId", "nodoDestinoId"]
                              }
                          }
                      },
                      "required": ["nombre_flujo", "tipo_solicitud", "nodos", "conexiones"]
                  }
              }
          )
          
        return json.loads(response.text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar el flujo de trabajo: {str(e)}"
        )



