import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService, Departamento } from '../services/admin.service';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './department-list.component.html',
  styleUrl: './department-list.component.scss'
})
export class DepartmentListComponent implements OnInit {
  departamentos: Departamento[] = [];
  loading = true; mostrarForm = false; guardando = false;
  form: FormGroup;
  cols = ['nombre', 'descripcion', 'activo'];

  constructor(private adminService: AdminService, private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['']
    });
  }

  ngOnInit(): void {
    this.adminService.listarDepartamentos().subscribe({
      next: data => { this.departamentos = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    this.adminService.crearDepartamento(this.form.value).subscribe({
      next: nuevo => {
        this.departamentos.push(nuevo);
        this.form.reset(); this.mostrarForm = false; this.guardando = false;
      },
      error: () => { this.guardando = false; }
    });
  }

  // Paginación
  pageSize = 10;
  currentPage = 0;

  get paginatedDepartamentos(): Departamento[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.departamentos.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.departamentos.length / this.pageSize);
  }

  cambiarPagina(incremento: number): void {
    const nuevaPagina = this.currentPage + incremento;
    if (nuevaPagina >= 0 && nuevaPagina < this.totalPages) {
      this.currentPage = nuevaPagina;
    }
  }
}
