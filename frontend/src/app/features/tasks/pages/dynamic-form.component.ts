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
    { valor: 'ARCHIVO', label: 'Archivo / Imagen', icono: 'attach_file' },
    { valor: 'SELECT', label: 'Selector (Menú Desplegable)', icono: 'arrow_drop_down_circle' },
    { valor: 'CHECKLIST', label: 'Lista de Selección (Checklist)', icono: 'checklist' },
    { valor: 'TABLA', label: 'Tabla de Datos', icono: 'table_chart' }
  ];

  parsedTables: Record<string, Array<Record<string, string>>> = {};

  constructor(
    private taskService: TaskService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Clonar campos iniciales para no mutar el Input directamente
    this.campos = this.camposIniciales.map(c => ({ ...c }));
    this.initializeTables();
  }

  initializeTables(): void {
    this.parsedTables = {};
    for (const campo of this.campos) {
      if (campo.tipo === 'TABLA') {
        this.parsedTables[campo.id] = this.getParsedTableRows(campo);
      }
    }
  }

  getParsedTableRows(campo: CampoFormulario): Array<Record<string, string>> {
    if (!campo.valor) return [];
    try {
      const parsed = JSON.parse(campo.valor as string);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  getParsedOpciones(opciones?: string): string[] {
    if (!opciones) return [];
    return opciones.split(',').map(o => o.trim()).filter(o => o.length > 0);
  }

  getColumns(campo: CampoFormulario): string[] {
    return this.getParsedOpciones(campo.opciones);
  }

  agregarFila(campo: CampoFormulario): void {
    const cols = this.getColumns(campo);
    if (cols.length === 0) return;
    
    if (!this.parsedTables[campo.id]) {
      this.parsedTables[campo.id] = [];
    }
    
    const newRow: Record<string, string> = {};
    for (const col of cols) {
      newRow[col] = '';
    }
    this.parsedTables[campo.id].push(newRow);
    this.actualizarValorTabla(campo);
  }

  eliminarFila(campo: CampoFormulario, rowIndex: number): void {
    if (this.parsedTables[campo.id]) {
      this.parsedTables[campo.id].splice(rowIndex, 1);
      this.actualizarValorTabla(campo);
    }
  }

  actualizarValorTabla(campo: CampoFormulario): void {
    const rows = this.parsedTables[campo.id] || [];
    campo.valor = JSON.stringify(rows);
    this.guardadoOk = false;
  }

  onTipoChange(campo: CampoFormulario): void {
    if (campo.tipo === 'TABLA') {
      if (!this.parsedTables[campo.id]) {
        this.parsedTables[campo.id] = [];
      }
      campo.valor = '[]';
    } else if (campo.tipo === 'CHECKLIST') {
      campo.valor = '[]';
    } else {
      campo.valor = '';
    }
    this.guardadoOk = false;
  }

  // Métodos para Checklist
  isItemChecked(campo: CampoFormulario, item: string): boolean {
    if (!campo.valor) return false;
    try {
      const selected = JSON.parse(campo.valor as string);
      return Array.isArray(selected) && selected.includes(item);
    } catch {
      return (campo.valor as string).split(',').map(v => v.trim()).includes(item);
    }
  }

  toggleItemChecked(campo: CampoFormulario, item: string, checked: boolean): void {
    let selected: string[] = [];
    if (campo.valor) {
      try {
        selected = JSON.parse(campo.valor as string);
        if (!Array.isArray(selected)) selected = [];
      } catch {
        selected = (campo.valor as string).split(',').map(v => v.trim()).filter(v => v.length > 0);
      }
    }
    if (checked) {
      if (!selected.includes(item)) selected.push(item);
    } else {
      selected = selected.filter(v => v !== item);
    }
    campo.valor = JSON.stringify(selected);
    this.guardadoOk = false;
  }

  getSelectedItems(campo: CampoFormulario): string[] {
    if (!campo.valor) return [];
    try {
      const selected = JSON.parse(campo.valor as string);
      return Array.isArray(selected) ? selected : [];
    } catch {
      return (campo.valor as string).split(',').map(v => v.trim()).filter(v => v.length > 0);
    }
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
        this.initializeTables();
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
      EMAIL: 'email', ARCHIVO: 'attach_file',
      SELECT: 'arrow_drop_down_circle', CHECKLIST: 'checklist', TABLA: 'table_chart'
    };
    return m[tipo] ?? 'input';
  }
}
