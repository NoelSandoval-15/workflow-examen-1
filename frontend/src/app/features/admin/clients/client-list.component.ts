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
import { AdminService, Cliente } from '../services/admin.service';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.scss'
})
export class ClientListComponent implements OnInit {
  clientes: Cliente[] = [];
  loading = true; mostrarForm = false; guardando = false;
  form: FormGroup;
  cols = ['nombre', 'correo', 'telefono'];

  // Paginación
  pageSize = 10;
  currentPage = 1;

  get paginatedClientes(): Cliente[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.clientes.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.clientes.length / this.pageSize);
  }

  cambiarPagina(delta: number): void {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  constructor(private adminService: AdminService, private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apellido: [''],
      correo: ['', Validators.email],
      telefono: [''],
      direccion: ['']
    });
  }

  ngOnInit(): void {
    this.adminService.listarClientes().subscribe({
      next: data => { this.clientes = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    this.adminService.crearCliente(this.form.value).subscribe({
      next: nuevo => {
        this.clientes.push(nuevo);
        this.form.reset(); this.mostrarForm = false; this.guardando = false;
      },
      error: () => { this.guardando = false; }
    });
  }
}
