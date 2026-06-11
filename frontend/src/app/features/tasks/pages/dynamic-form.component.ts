import {
  Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TaskService, CampoFormulario } from '../../tasks/services/task.service';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatSelectModule, MatCheckboxModule,
    MatProgressSpinnerModule, MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss'
})
export class DynamicFormComponent implements OnInit {

  /** ID de la tarea donde se guardará el formulario */
  @Input() tareaId!: string;

  /** Campos ya guardados previamente (para editar) */
  @Input() camposIniciales: CampoFormulario[] = [];

  /** Estado de la tarea: si está COMPLETADO, el form es de solo lectura */
  @Input() soloLectura = false;

  /** Emite el DTO actualizado después de guardar */
  @Output() formularioGuardado = new EventEmitter<CampoFormulario[]>();

  campos: CampoFormulario[] = [];
  guardando = false;
  guardadoOk = false;
  error = '';

  readonly tipoOpciones = [
    { valor: 'TEXTO', label: 'Texto Corto', icono: 'short_text' },
    { valor: 'TEXTO_LARGO', label: 'Texto Largo (Párrafo)', icono: 'notes' },
    { valor: 'NUMERO', label: 'Número', icono: 'numbers' },
    { valor: 'FECHA', label: 'Fecha', icono: 'calendar_today' },
    { valor: 'CHECKBOX', label: 'Casilla (Sí/No)', icono: 'check_box' },
    { valor: 'TELEFONO', label: 'Teléfono', icono: 'phone' },
    { valor: 'EMAIL', label: 'Correo Electrónico', icono: 'email' },
    { valor: 'ARCHIVO', label: 'Archivo / Imagen', icono: 'attach_file' }
  ];

  constructor(
    private taskService: TaskService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Clonar campos iniciales para no mutar el Input directamente
    this.campos = this.camposIniciales.map(c => ({ ...c }));
  }

  agregarCampo(): void {
    this.campos.push({
      id: crypto.randomUUID(),
      etiqueta: '',
      tipo: 'TEXTO',
      requerido: false,
      valor: ''
    });
    this.guardadoOk = false;
  }

  eliminarCampo(index: number): void {
    this.campos.splice(index, 1);
    this.guardadoOk = false;
  }

  moverArriba(index: number): void {
    if (index <= 0) return;
    [this.campos[index - 1], this.campos[index]] = [this.campos[index], this.campos[index - 1]];
  }

  moverAbajo(index: number): void {
    if (index >= this.campos.length - 1) return;
    [this.campos[index], this.campos[index + 1]] = [this.campos[index + 1], this.campos[index]];
  }

  onArchivoSeleccionado(event: Event, campo: CampoFormulario): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    campo.archivoNombre = file.name;
    // En una implementación real se subiría a un endpoint de archivos.
    // Por ahora guardamos el nombre como valor referencial.
    campo.valor = file.name;
    this.guardadoOk = false;
    this.cdr.detectChanges();
  }

  guardar(): void {
    this.error = '';
    // Validar etiquetas
    const sinEtiqueta = this.campos.some(c => !c.etiqueta?.trim());
    if (sinEtiqueta) {
      this.error = 'Todos los campos deben tener una etiqueta.';
      return;
    }

    this.guardando = true;
    this.taskService.guardarFormulario(this.tareaId, this.campos).subscribe({
      next: tarea => {
        this.guardando = false;
        this.guardadoOk = true;
        this.campos = tarea.datosFormulario ?? [];
        this.formularioGuardado.emit(this.campos);
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardando = false;
        this.error = 'No se pudo guardar el formulario. Inténtalo de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  getIconoTipo(tipo: string): string {
    const m: Record<string, string> = {
      TEXTO: 'short_text', TEXTO_LARGO: 'notes', NUMERO: 'numbers',
      FECHA: 'calendar_today', CHECKBOX: 'check_box', TELEFONO: 'phone',
      EMAIL: 'email', ARCHIVO: 'attach_file'
    };
    return m[tipo] ?? 'input';
  }
}
