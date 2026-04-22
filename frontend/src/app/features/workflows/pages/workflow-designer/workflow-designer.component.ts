import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorkflowTemplateService } from '../../services/workflow-template.service';
import { BpmnModelerComponent } from '../../components/bpmn-modeler/bpmn-modeler.component';

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule,
    MatProgressSpinnerModule, BpmnModelerComponent
  ],
  templateUrl: './workflow-designer.component.html',
  styleUrl: './workflow-designer.component.scss'
})
export class WorkflowDesignerComponent {
  @ViewChild('modeler') modelerRef!: BpmnModelerComponent;

  form: FormGroup;
  guardando = false;

  constructor(
    private fb: FormBuilder,
    private templateService: WorkflowTemplateService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      tipoSolicitud: ['', Validators.required]
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Completa nombre y tipo de solicitud', 'OK', { duration: 3000 });
      return;
    }

    const { nodos, conexiones } = this.modelerRef.extractData();

    if (nodos.length === 0) {
      this.snackBar.open('El diagrama no tiene nodos', 'OK', { duration: 3000 });
      return;
    }

    this.guardando = true;
    this.templateService.crear({ ...this.form.value, nodos, conexiones }).subscribe({
      next: () => {
        this.snackBar.open('Flujo guardado correctamente', 'OK', { duration: 2500 });
        this.router.navigate(['/flujos']);
      },
      error: () => {
        this.snackBar.open('Error al guardar el flujo', 'OK', { duration: 3000 });
        this.guardando = false;
      }
    });
  }

  volver(): void {
    this.router.navigate(['/flujos']);
  }
}
