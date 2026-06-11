import io
import datetime
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Diccionario de traducción de categorías y filtros para títulos
TRADUCCION_TITULOS = {
    "tramites": "Trámites (Instancias de Proceso)",
    "documentos": "Documentos (Archivos subidos)",
    "usuarios": "Usuarios y Funcionarios",
    "clientes": "Clientes registrados",
    "politicas": "Políticas de Negocio (Templates)",
    "atrasados": "Atrasados / Demorados",
    "pendientes": "Pendientes / En Progreso",
    "completados": "Completados / Aprobados",
    "todos": "Lista Completa"
}

# Mapeo estricto de columnas permitidas y títulos legibles para cada reporte
MAPEO_COLUMNAS = {
    "tramites": {
        "codigo": "Código Trámite",
        "clienteNombre": "Nombre Cliente",
        "estadoActual": "Estado",
        "prioridad": "Prioridad",
        "createdAt": "Fecha Registro",
        "updatedAt": "Última Actualización"
    },
    "documentos": {
        "nombreArchivo": "Nombre de Archivo",
        "extension": "Extensión",
        "tamanoBytes": "Tamaño",
        "descripcion": "Descripción",
        "createdAt": "Fecha de Carga"
    },
    "usuarios": {
        "username": "Usuario",
        "nombre": "Nombre",
        "apellido": "Apellido",
        "correo": "Correo Electrónico",
        "departamentoId": "Departamento",
        "rolId": "Rol"
    },
    "clientes": {
        "nombre": "Nombre",
        "apellido": "Apellido",
        "correo": "Correo Electrónico",
        "telefono": "Teléfono",
        "direccion": "Dirección"
    },
    "politicas": {
        "nombre": "Nombre Política",
        "tipoSolicitud": "Tipo de Solicitud",
        "version": "Versión",
        "estado": "Estado"
    }
}

def traducir_termino(term: str) -> str:
    return TRADUCCION_TITULOS.get(term, term.capitalize())

TRADUCCION_DEPARTAMENTOS = {
    "LEGAL": "Legal",
    "FINANZAS": "Finanzas",
    "ATENCION_CLIENTE": "Atención al cliente",
    "SISTEMA": "Sistema",
    "OPERACIONES": "Operaciones",
    "ARCHIVO": "Archivo",
    "dep-002": "Ingeniería",
    "dep-003": "Cobranzas",
    "dep-004": "Logística",
    "dep-005": "Supervisión General"
}

def filtrar_y_traducir_datos(categoria: str, datos: list) -> list:
    """
    Filtra las columnas técnicas (IDs, clases, etc.) y renombra las claves
    a cabeceras de negocio en español de forma ordenada y tolerante a mayúsculas/minúsculas.
    """
    if not datos:
        return []
        
    # Si los datos ya vienen formateados como métrica (KPI), no aplicar mapeos de columnas técnicas
    if isinstance(datos, list) and len(datos) > 0 and isinstance(datos[0], dict) and "Métrica" in datos[0]:
        return datos
        
    categoria_clean = categoria.lower() if isinstance(categoria, str) else ""
    mapeo = MAPEO_COLUMNAS.get(categoria_clean, {})
    
    datos_procesados = []
    for d in datos:
        if not isinstance(d, dict):
            continue
            
        d_nuevo = {}
        if mapeo:
            for clave_original, clave_es in mapeo.items():
                val = None
                # Buscar de forma insensible a mayúsculas/minúsculas
                for k, v in d.items():
                    if k.lower() == clave_original.lower():
                        val = v
                        break
                
                if val is not None:
                    # Traducir departamentos
                    if clave_original.lower() == "departamentoid" and isinstance(val, str):
                        val = TRADUCCION_DEPARTAMENTOS.get(val.upper(), val)
                    
                    # Formatear el tamaño en bytes a KB
                    elif clave_original == "tamanoBytes" and isinstance(val, (int, float)):
                        val = f"{round(val / 1024, 1)} KB"
                    
                    # Formatear fechas ISO a formato legible
                    elif clave_original in ["createdAt", "updatedAt"] and isinstance(val, str):
                        if "T" in val:
                            fecha, hora = val.split("T")
                            val = f"{fecha} {hora[:5]}"
                    
                    d_nuevo[clave_es] = val
                else:
                    d_nuevo[clave_es] = "-"
        else:
            # Fallback robusto sin mapeo: excluir claves técnicas
            for k, v in d.items():
                k_lower = k.lower()
                # Excluir explícitamente IDs del sistema y clases
                if k_lower in ["_class", "_id", "id", "esseeder", "passwordhash", "templateid", "clienteid", "responsableactualid", "rolid", "camundaprocessinstanceid", "camundataskid"]:
                    continue
                
                val = v
                # Traducir departamentos
                if k_lower == "departamentoid" and isinstance(val, str):
                    val = TRADUCCION_DEPARTAMENTOS.get(val.upper(), val)
                # Formatear fechas
                elif k_lower in ["createdat", "updatedat"] and isinstance(val, str) and "T" in val:
                    fecha, hora = val.split("T")
                    val = f"{fecha} {hora[:5]}"
                
                # Crear nombre de columna limpio
                k_pretty = k.replace("Id", " ID").replace("Nombre", " Nombre")
                # Capitalizar primera letra de cada palabra
                k_pretty = " ".join([w.capitalize() for w in k_pretty.split("_") if w])
                
                d_nuevo[k_pretty] = val if val is not None else "-"
                
        if d_nuevo:
            datos_procesados.append(d_nuevo)
            
    return datos_procesados

def generar_archivo_reporte(categoria: str, criterio: str, formato: str, datos_sucios: list):
    """
    Genera un reporte en binario en base a los datos de MongoDB y el formato solicitado.
    Filtra y traduce las columnas para asegurar un formato profesional.
    Soporta PDF, Excel (xlsx) y Word (doc compatible).
    """
    categoria_es = traducir_termino(categoria)
    criterio_es = traducir_termino(criterio)
    fecha_generacion = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # Filtrar y limpiar columnas e IDs técnicos
    datos = filtrar_y_traducir_datos(categoria, datos_sucios)

    # --- 1. FORMATO EXCEL ---
    if formato == "excel":
        buffer = io.BytesIO()
        if not datos:
            df = pd.DataFrame([{"Mensaje": "No se encontraron registros que coincidan con el filtro solicitado."}])
        else:
            df = pd.DataFrame(datos)

        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name="Reporte IA")
            
        buffer.seek(0)
        return buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"Reporte_{categoria}_{criterio}.xlsx"

    # --- 2. FORMATO PDF (ReportLab) ---
    elif formato == "pdf":
        buffer = io.BytesIO()
        # Inicializar documento PDF
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter, 
            rightMargin=36, 
            leftMargin=36, 
            topMargin=36, 
            bottomMargin=36
        )
        story = []
        styles = getSampleStyleSheet()

        # Estilo del Título
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor("#4f46e5"), # Indigo
            spaceAfter=6
        )
        
        # Estilo del Subtítulo
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor("#475569"),
            spaceAfter=15
        )
        
        # Agregar Cabecera
        story.append(Paragraph(f"Reporte Inteligente de {categoria_es}", title_style))
        story.append(Paragraph(f"Filtro aplicado: {criterio_es}  |  Fecha de generación: {fecha_generacion}", subtitle_style))

        # Crear Tabla
        table_data = []
        if datos:
            headers = list(datos[0].keys())
            
            # Encabezados en negrita y blanco
            header_style = ParagraphStyle('HeaderStyle', parent=styles['Normal'], fontSize=9, textColor=colors.white, fontName="Helvetica-Bold")
            table_data.append([Paragraph(h, header_style) for h in headers])
            
            # Filas
            cell_style = ParagraphStyle('CellStyle', parent=styles['Normal'], fontSize=8.5, textColor=colors.HexColor("#334155"))
            for d in datos:
                row = []
                for h in headers:
                    val = d.get(h, "-")
                    row.append(Paragraph(str(val), cell_style))
                table_data.append(row)
        else:
            table_data.append([Paragraph("No se encontraron registros para mostrar.", styles['Normal'])])

        # Configurar la tabla de ReportLab para que se autoajuste al ancho de la hoja
        # El ancho disponible es de 540 puntos (612 de ancho carta - 72 de márgenes)
        ancho_tabla = 540
        t = Table(table_data)
        
        # Estilo de la tabla
        t_style = [
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#6366f1")), # Encabezado morado
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('BOTTOMPADDING', (0,1), (-1,-1), 5),
            ('TOPPADDING', (0,1), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]
        
        # Zebra striping (filas alternadas) si hay registros
        if datos:
            for i in range(1, len(table_data)):
                if i % 2 == 0:
                    t_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor("#f8fafc")))
                    
        t.setStyle(TableStyle(t_style))
        story.append(t)
        
        # Construir PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue(), "application/pdf", f"Reporte_{categoria}_{criterio}.pdf"

    # --- 3. FORMATO WORD (HTML compatible con MS Word) ---
    else:
        html_content = f"""
        <html>
        <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 20px; }}
            h1 {{ color: #4f46e5; border-bottom: 2px solid #6366f1; padding-bottom: 8px; font-size: 18pt; }}
            .metadata {{ font-size: 10pt; color: #64748b; margin-bottom: 20px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th {{ background-color: #6366f1; color: white; padding: 8px 12px; text-align: left; font-size: 10pt; font-weight: bold; border: 1px solid #cbd5e1; }}
            td {{ padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 9.5pt; color: #334155; }}
            .odd {{ background-color: #f8fafc; }}
        </style>
        </head>
        <body>
            <h1>Reporte Inteligente de {categoria_es}</h1>
            <div class="metadata">
                <strong>Filtro aplicado:</strong> {criterio_es} <br>
                <strong>Fecha de generación:</strong> {fecha_generacion}
            </div>
            <table>
                <thead>
                    <tr>
        """
        
        if datos:
            headers = list(datos[0].keys())
            for h in headers:
                html_content += f"<th>{h}</th>"
            html_content += "</tr></thead><tbody>"
            
            for idx, d in enumerate(datos):
                row_class = 'class="odd"' if idx % 2 != 0 else ''
                html_content += f"<tr {row_class}>"
                for h in headers:
                    val = d.get(h, "-")
                    html_content += f"<td>{val}</td>"
                html_content += "</tr>"
        else:
            html_content += "<th>Mensaje</th></tr></thead><tbody><tr><td>No se encontraron registros para mostrar.</td></tr>"
            
        html_content += """
                </tbody>
            </table>
        </body>
        </html>
        """
        return html_content.encode('utf-8'), "application/msword", f"Reporte_{categoria}_{criterio}.doc"
