import os
import random
import csv

# Definición de las carpetas y rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS_DIR = os.path.join(BASE_DIR, "datos")
CSV_PATH = os.path.join(DATOS_DIR, "dataset_reportes.csv")

# Asegurar que la carpeta datos exista
os.makedirs(DATOS_DIR, exist_ok=True)

# 1. Definición de diccionarios de términos y sinónimos
sinonimos_categoria = {
    "tramites": ["trámites", "trámite", "procesos", "flujos de trabajo", "solicitudes", "casos", "peticiones"],
    "documentos": ["documentos", "documento", "archivos", "archivo", "ficheros", "fichero", "requisitos", "papeles", "adjuntos"],
    "usuarios": ["usuarios", "usuario", "funcionarios", "funcionario", "empleados", "empleado", "operadores", "operador", "personal"],
    "clientes": ["clientes", "cliente", "solicitantes", "solicitante", "usuarios finales", "personas", "ciudadanos"],
    "politicas": ["políticas de negocio", "políticas", "política de negocio", "política", "reglas de negocio", "reglas", "diagramas de actividad", "diagramas"]
}

sinonimos_criterio = {
    "atrasados": ["atrasados", "atrasado", "demorados", "demorado", "fuera de plazo", "con retraso", "vencidos", "vencido", "tardíos", "con demora"],
    "pendientes": ["pendientes", "pendiente", "en progreso", "activos", "activo", "sin terminar", "en curso", "en proceso", "procesando"],
    "completados": ["completados", "completado", "finalizados", "finalizado", "terminados", "terminado", "aprobados", "aprobado", "resueltos", "resuelto", "hechos"],
    "todos": ["todos", "todas", "lista completa", "general", "total", "completo", "global", "sin filtros", "cualquiera"]
}

sinonimos_formato = {
    "pdf": ["pdf", "formato pdf", "en pdf", "documento pdf", "archivo pdf", "formato portable"],
    "excel": ["excel", "xlsx", "hoja de cálculo", "en excel", "archivo excel", "formato excel", "hoja excel"],
    "word": ["word", "docx", "documento word", "en word", "archivo word", "formato word", "documento editable"],
    "pantalla": ["pantalla", "visualizar", "ver", "mostrar", "json", "en pantalla", "consola", "vista previa", "formato json"]
}

# 2. Plantillas de oraciones para generar variaciones
plantillas = [
    # Solicitudes directas
    "generar un reporte de {categoria} {criterio} en {formato}",
    "quiero un reporte de {categoria} {criterio} en {formato}",
    "necesito el reporte de {categoria} {criterio} en {formato}",
    "dame los {categoria} {criterio} en formato {formato}",
    "muéstrame un reporte de {categoria} {criterio} en {formato}",
    "obtener reporte de {categoria} {criterio} en {formato}",
    "descargar reporte de {categoria} {criterio} en {formato}",
    "crear reporte de {categoria} {criterio} en {formato}",
    "por favor genera un reporte de {categoria} {criterio} en {formato}",
    "podrías generarme un reporte de {categoria} {criterio} en {formato}",
    
    # Variaciones de formato al inicio o final
    "en {formato} quiero el reporte de {categoria} {criterio}",
    "en formato {formato} dame los {categoria} {criterio}",
    "descargar en {formato} el reporte de {categoria} {criterio}",
    "exportar a {formato} los {categoria} {criterio}",
    "quiero exportar en {formato} las {categoria} {criterio}",
    "necesito exportar a {formato} el listado de {categoria} {criterio}",
    
    # Oraciones cortas / estilo comando
    "reporte {categoria} {criterio} {formato}",
    "lista {categoria} {criterio} {formato}",
    "listado {categoria} {criterio} {formato}",
    "datos {categoria} {criterio} {formato}",
    
    # Conectores y preguntas
    "¿cómo puedo ver el reporte de {categoria} {criterio} en {formato}?",
    "¿es posible obtener los {categoria} {criterio} en {formato}?",
    "quisiera ver la lista de {categoria} {criterio} y bajarla en {formato}",
    "sácame un reporte de {categoria} {criterio} en {formato}",
    "hazme un reporte de {categoria} {criterio} en {formato}",
    
    # Sin filtro explícito (que mapea a "todos" pero a veces el usuario no dice "todos")
    "generar un reporte de {categoria} en {formato}",
    "quiero un reporte de {categoria} en {formato}",
    "necesito el reporte de {categoria} en {formato}",
    "dame los {categoria} en formato {formato}",
    "muéstrame un reporte de {categoria} en {formato}",
    "obtener reporte de {categoria} en {formato}",
    "descargar reporte de {categoria} en {formato}",
    "crear reporte de {categoria} en {formato}",
    "exportar a {formato} los {categoria}",
    "reporte {categoria} {formato}",
    "lista {categoria} {formato}"
]

def generar_dataset(num_muestras=3000):
    datos_generados = []
    
    # Para evitar duplicados exactos
    textos_unicos = set()
    
    intentos = 0
    max_intentos = num_muestras * 10
    
    while len(datos_generados) < num_muestras and intentos < max_intentos:
        intentos += 1
        
        # Seleccionar categoría, criterio y formato aleatoriamente
        cat_key = random.choice(list(sinonimos_categoria.keys()))
        crit_key = random.choice(list(sinonimos_criterio.keys()))
        form_key = random.choice(list(sinonimos_formato.keys()))
        
        # Elegir sinónimos aleatorios
        cat_val = random.choice(sinonimos_categoria[cat_key])
        crit_val = random.choice(sinonimos_criterio[crit_key])
        form_val = random.choice(sinonimos_formato[form_key])
        
        # Seleccionar una plantilla al azar
        plantilla = random.choice(plantillas)
        
        # Si la plantilla no incluye criterio, forzar el criterio a "todos"
        if "{criterio}" not in plantilla:
            crit_label = "todos"
            texto = plantilla.format(categoria=cat_val, formato=form_val)
        else:
            crit_label = crit_key
            texto = plantilla.format(categoria=cat_val, criterio=crit_val, formato=form_val)
            
        # Limpieza básica: quitar espacios dobles, capitalizar primera letra
        texto = " ".join(texto.split())
        texto = texto.capitalize()
        
        # Agregar algo de ruido aleatorio (minúsculas, mayúsculas, signos de puntuación)
        if random.random() < 0.15:
            texto = texto.lower()
        if random.random() < 0.05:
            texto = texto.upper()
        if random.random() < 0.1:
            texto = texto + "."
        elif random.random() < 0.05:
            texto = texto + "!"
            
        if texto not in textos_unicos:
            textos_unicos.add(texto)
            datos_generados.append({
                "texto": texto,
                "categoria": cat_key,
                "criterio": crit_label,
                "formato": form_key
            })
            
    return datos_generados

def guardar_csv(datos):
    with open(CSV_PATH, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["texto", "categoria", "criterio", "formato"])
        writer.writeheader()
        writer.writerows(datos)
    print(f"Dataset generado exitosamente con {len(datos)} registros en: {CSV_PATH}")

if __name__ == "__main__":
    random.seed(42)  # Para reproducibilidad
    datos = generar_dataset(2500)
    guardar_csv(datos)
