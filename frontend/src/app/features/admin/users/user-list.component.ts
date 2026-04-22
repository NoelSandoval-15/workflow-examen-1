import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService, User, Departamento } from '../services/admin.service';

export interface Rol { id: string; label: string; descripcion: string; }

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit {
  usuarios: User[] = [];
  departamentos: Departamento[] = [];
  loading = true;
  mostrarForm = false;
  guardando = false;
  form: FormGroup;
  cols = ['nombre', 'username', 'correo', 'rolId', 'departamento', 'activo'];

  readonly roles: Rol[] = [
    { id: 'ADMIN',       label: 'Administrador',  descripcion: 'Acceso total al sistema' },
    { id: 'SUPERVISOR',  label: 'Supervisor',      descripcion: 'Gestión de departamento' },
    { id: 'FUNCIONARIO', label: 'Funcionario',     descripcion: 'Atención de trámites' },
  ];

  constructor(private adminService: AdminService, private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.form = this.fb.group({
      nombre:        ['', Validators.required],
      apellido:      ['', Validators.required],
      correo:        ['', [Validators.required, Validators.email]],
      username:      ['', Validators.required],
      password:      ['', [Validators.required, Validators.minLength(6)]],
      rolId:         ['', Validators.required],
      departamentoId:['']
    });
  }

  ngOnInit(): void {
    this.adminService.listarUsuarios().subscribe({
      next: data => { this.usuarios = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
    this.adminService.listarDepartamentos().subscribe({
      next: data => { this.departamentos = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  getNombreDepartamento(id: string): string {
    return this.departamentos.find(d => d.id === id)?.nombre ?? id ?? '—';
  }

  getRolLabel(id: string): string {
    return this.roles.find(r => r.id === id)?.label ?? id;
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    this.adminService.crearUsuario(this.form.value).subscribe({
      next: nuevo => {
        this.usuarios = [...this.usuarios, nuevo];
        this.form.reset();
        this.mostrarForm = false;
        this.guardando = false;
      },
      error: () => { this.guardando = false; }
    });
  }
}
