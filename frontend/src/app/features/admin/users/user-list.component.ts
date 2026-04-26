import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AdminService, User, Departamento } from '../services/admin.service';

interface GrupoRol { id: string; label: string; icono: string; color: string; usuarios: User[]; }

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule, MatTooltipModule, MatDividerModule
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
  usuarioEditando: User | null = null;
  form: FormGroup;

  readonly rolesOrden = [
    { id: 'ADMIN',       label: 'Administradores', icono: 'admin_panel_settings', color: '#f59e0b' },
    { id: 'SUPERVISOR',  label: 'Supervisores',    icono: 'manage_accounts',      color: '#3b82f6' },
    { id: 'FUNCIONARIO', label: 'Funcionarios',    icono: 'badge',                color: '#10b981' },
  ];

  constructor(private adminService: AdminService, private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.form = this.buildForm();
  }

  private buildForm(edicion = false): FormGroup {
    return this.fb.group({
      nombre:        ['', Validators.required],
      apellido:      ['', Validators.required],
      correo:        ['', [Validators.required, Validators.email]],
      username:      ['', Validators.required],
      password:      edicion ? [''] : ['', [Validators.required, Validators.minLength(6)]],
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

  get grupos(): GrupoRol[] {
    return this.rolesOrden.map(r => ({
      ...r,
      usuarios: this.usuarios.filter(u => u.rolId?.toUpperCase() === r.id)
    })).filter(g => g.usuarios.length > 0);
  }

  getNombreDepartamento(id: string): string {
    return this.departamentos.find(d => d.id === id)?.nombre ?? id ?? '—';
  }

  abrirFormNuevo(): void {
    this.usuarioEditando = null;
    this.form = this.buildForm(false);
    this.mostrarForm = true;
    this.cdr.detectChanges();
  }

  abrirFormEditar(u: User): void {
    this.usuarioEditando = u;
    this.form = this.buildForm(true);
    this.form.patchValue({
      nombre: u.nombre, apellido: u.apellido,
      correo: u.correo, username: u.username,
      rolId: u.rolId, departamentoId: u.departamentoId ?? ''
    });
    this.mostrarForm = true;
    this.cdr.detectChanges();
  }

  cancelar(): void {
    this.mostrarForm = false;
    this.usuarioEditando = null;
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    const val = this.form.value;

    if (this.usuarioEditando) {
      // Edición: solo enviar password si se escribió algo
      const req: any = { nombre: val.nombre, apellido: val.apellido, correo: val.correo,
                         username: val.username, rolId: val.rolId, departamentoId: val.departamentoId };
      if (val.password?.trim()) req.password = val.password;

      this.adminService.actualizarUsuario(this.usuarioEditando.id, req).subscribe({
        next: actualizado => {
          this.usuarios = this.usuarios.map(u => u.id === actualizado.id ? actualizado : u);
          this.cancelar();
          this.guardando = false;
          this.cdr.detectChanges();
        },
        error: () => { this.guardando = false; this.cdr.detectChanges(); }
      });
    } else {
      this.adminService.crearUsuario(val).subscribe({
        next: nuevo => {
          this.usuarios = [...this.usuarios, nuevo];
          this.cancelar();
          this.guardando = false;
          this.cdr.detectChanges();
        },
        error: () => { this.guardando = false; this.cdr.detectChanges(); }
      });
    }
  }
}
