import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Mensaje {
  texto: string;
  emisor: 'usuario' | 'ia';
  reporte?: { nombre: string; url: string; tipo: string };
  datos?: any[];
  mostrarTabla?: boolean;
  metadata_ia?: {
    categoria: number;
    criterio: number;
    formato: number;
    categoria_str: string;
    criterio_str: string;
    formato_str: string;
  };
}

@Component({
  selector: 'app-asistente-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, MatIconModule, MatButtonModule],
  templateUrl: './asistente-ia.component.html',
  styleUrls: ['./asistente-ia.component.scss']
})
export class AsistenteIaComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  mensajes: Mensaje[] = [
    { 
      texto: '¡Hola! Soy tu Asistente IA. Escribe o usa la voz para pedir un reporte dinámico. Por ejemplo:\n• "Dame los trámites atrasados en PDF"\n• "Quiero ver los documentos en pantalla"\n• "Generar reporte de clientes activos en Excel"', 
      emisor: 'ia' 
    }
  ];
  
  nuevoMensaje: string = '';
  cargando: boolean = false;
  escuchando: boolean = false;
  fastApiStatus: boolean = true;

  sugerencias: string[] = [
    'Dame los trámites atrasados en PDF',
    'Mostrar documentos en pantalla',
    'Reporte de clientes activos en Excel',
    'Políticas de negocio en borrador en Word'
  ];

  private recognition: any;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private ngZone: NgZone) {
    // Inicialización de la API de reconocimiento de voz nativa del navegador
    const { webkitSpeechRecognition, SpeechRecognition } = window as any;
    const SpeechRec = SpeechRecognition || webkitSpeechRecognition;
    
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.lang = 'es-BO'; // Configurado en español de Bolivia / Latinoamérica
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        this.ngZone.run(() => {
          const transcripcion = event.results[0][0].transcript;
          this.nuevoMensaje = transcripcion;
          this.escuchando = false;
          this.enviarConsulta();
        });
      };

      this.recognition.onerror = (err: any) => {
        this.ngZone.run(() => {
          console.error('Error en reconocimiento de voz:', err);
          this.escuchando = false;
        });
      };

      this.recognition.onend = () => {
        this.ngZone.run(() => {
          this.escuchando = false;
        });
      };
    }
  }

  ngOnInit(): void {
    this.verificarConexionFastApi();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  verificarConexionFastApi() {
    this.http.get<any>('http://localhost:8000/').subscribe({
      next: (res) => {
        this.fastApiStatus = res.nlp_model_loaded;
        this.cdr.detectChanges();
      },
      error: () => {
        this.fastApiStatus = false;
        this.cdr.detectChanges();
      }
    });
  }

  usarSugerencia(prompt: string) {
    this.nuevoMensaje = prompt;
    this.cdr.detectChanges();
    this.enviarConsulta();
  }

  activarMicrofono() {
    if (!this.recognition) {
      alert('Tu navegador no soporta el reconocimiento de voz. Te recomendamos usar Google Chrome.');
      return;
    }
    
    if (this.escuchando) {
      this.recognition.stop();
      this.escuchando = false;
    } else {
      this.escuchando = true;
      this.recognition.start();
    }
    this.cdr.detectChanges();
  }

  enviarConsulta() {
    const textoConsulta = this.nuevoMensaje.trim();
    if (!textoConsulta || this.cargando) return;

    this.mensajes.push({ texto: textoConsulta, emisor: 'usuario' });
    this.nuevoMensaje = '';
    this.cargando = true;
    this.cdr.detectChanges(); // Refrescar para mostrar el globo del usuario y el spinner

    // Petición a FastAPI
    this.http.post<any>('http://localhost:8000/api/ia/nlp/analizar', { texto: textoConsulta }).subscribe({
      next: (res) => {
        this.cargando = false;
        this.fastApiStatus = true;

        const analisis = res.analisis;
        const confianza = res.confianza;
        const datos = res.datos || [];

        // Traducir términos del modelo a español legible
        const cat_es = this.traducirCategoria(analisis.categoria);
        const crit_es = this.traducirCriterio(analisis.criterio);
        const form_es = this.traducirFormato(analisis.formato);

        let respuestaIA = `He analizado tu solicitud usando Deep Learning:\n` +
                          `• **Datos:** ${cat_es}\n` +
                          `• **Filtro:** ${crit_es}\n` +
                          `• **Formato:** ${form_es}`;

        const metadata_ia = {
          categoria: confianza.categoria,
          criterio: confianza.criterio,
          formato: confianza.formato,
          categoria_str: cat_es,
          criterio_str: crit_es,
          formato_str: form_es
        };

        const nuevoMensajeIA: Mensaje = {
          texto: respuestaIA,
          emisor: 'ia',
          metadata_ia: metadata_ia
        };

        // Si el formato es de pantalla o json
        if (analisis.formato === 'pantalla' || analisis.formato === 'json') {
          nuevoMensajeIA.datos = datos;
          nuevoMensajeIA.mostrarTabla = true;
          if (datos.length === 0) {
            nuevoMensajeIA.texto += `\n\n⚠️ Conexión exitosa, pero no se encontraron registros en MongoDB con este criterio actualmente.`;
          } else {
            nuevoMensajeIA.texto += `\n\n✅ Se recuperaron ${datos.length} registros desde MongoDB exitosamente.`;
          }
        } else {
          // Si es un archivo físico descargable
          let queryParams = `?categoria=${analisis.categoria}&criterio=${analisis.criterio}&formato=${analisis.formato}`;
          if (analisis.departamento) {
            queryParams += `&departamento=${analisis.departamento}`;
          }
          if (analisis.rango_fecha) {
            queryParams += `&rango_fecha_inicio=${analisis.rango_fecha[0]}&rango_fecha_fin=${analisis.rango_fecha[1]}`;
          }
          if (analisis.nombre) {
            queryParams += `&nombre=${analisis.nombre}`;
          }
          if (analisis.kpi) {
            queryParams += `&kpi=${analisis.kpi}`;
          }
          
          nuevoMensajeIA.reporte = {
            nombre: `Reporte_${analisis.categoria}_${analisis.criterio}.${analisis.formato === 'excel' ? 'xlsx' : (analisis.formato === 'word' ? 'docx' : 'pdf')}`,
            url: `http://localhost:8000/api/ia/nlp/descargar${queryParams}`,
            tipo: analisis.formato
          };
        }

        this.mensajes.push(nuevoMensajeIA);
        this.cdr.detectChanges(); // Forzar redibujado del mensaje recibido y ocultación del spinner
      },
      error: (err) => {
        console.error('Error al conectar con la API de IA:', err);
        this.cargando = false;
        this.fastApiStatus = false;
        this.mensajes.push({
          texto: 'Lo siento, no he podido procesar tu solicitud. Asegúrate de que el microservicio de FastAPI esté encendido en el puerto 8000 y MongoDB esté activo.',
          emisor: 'ia'
        });
        this.cdr.detectChanges();
      }
    });
  }

  descargarReporte(reporte: any) {
    // Abre el endpoint de descarga en una nueva pestaña para forzar la descarga del PDF/Excel
    window.open(reporte.url, '_blank');
  }

  toggleVerTabla(msg: Mensaje) {
    msg.mostrarTabla = !msg.mostrarTabla;
    this.cdr.detectChanges();
  }

  private traducirCategoria(cat: string): string {
    const map: any = {
      'tramites': 'Trámites',
      'documentos': 'Documentos',
      'usuarios': 'Usuarios/Funcionarios',
      'clientes': 'Clientes',
      'politicas': 'Políticas de Negocio'
    };
    return map[cat] || cat;
  }

  private traducirCriterio(crit: string): string {
    const map: any = {
      'atrasados': 'Atrasados / Demorados',
      'pendientes': 'Pendientes / Activos',
      'completados': 'Completados / Aprobados',
      'todos': 'Sin Filtro (Todos)'
    };
    return map[crit] || crit;
  }

  private traducirFormato(form: string): string {
    const map: any = {
      'pdf': 'Documento PDF',
      'excel': 'Hoja de Cálculo Excel',
      'word': 'Documento Editable Word',
      'pantalla': 'Vista Previa en Pantalla'
    };
    return map[form] || form;
  }

  obtenerLlaves(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  esBoolean(val: any): boolean {
    return typeof val === 'boolean';
  }

  private scrollToBottom(): void {
    try {
      this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}

