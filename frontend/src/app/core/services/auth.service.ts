import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Observable, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;       // identificador único (UUID, GUID, etc.)
  name: string;     // nombre a mostrar en OnlyOffice
  nombre?: string;  // alias display
  username?: string;
  rolId?: string;   // rol del usuario
  token?: string;   // JWT (si el backend lo incluye en el objeto)
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<AuthUser | null>(null);

  /** Observable público */
  readonly user$: Observable<AuthUser | null> = this._user$.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Restaurar sesión desde localStorage
    try {
      const stored = localStorage.getItem('authUser');
      if (stored) this._user$.next(JSON.parse(stored));
    } catch { /* ignorar */ }
  }

  /** Login: envía credenciales y actualiza estado */
  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      map(res => {
        const data = res.data;
        return {
          id: data.userId,
          name: data.nombre,
          nombre: data.nombre,
          username: data.username,
          rolId: data.rolId,
          token: data.token
        } as AuthUser;
      }),
      tap((user: AuthUser) => {
        this._user$.next(user);
        localStorage.setItem('authUser', JSON.stringify(user));
        if (user.token) localStorage.setItem('token', user.token);
      })
    );
  }

  /** Logout: limpia estado y llama al backend */
  logout(): void {
    this._user$.next(null);
    localStorage.removeItem('authUser');
    localStorage.removeItem('token');
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    this.router.navigate(['/login']);
  }

  /** ¿Hay usuario autenticado? */
  isAuthenticated(): boolean {
    return this._user$.value !== null;
  }

  /** Devuelve el JWT si existe */
  getToken(): string | null {
    return this._user$.value?.token ?? localStorage.getItem('token');
  }

  /** Alias síncrono para obtener el usuario actual */
  getCurrentUser(): AuthUser | null {
    return this._user$.value;
  }

  /** Getter de conveniencia */
  get currentUser(): AuthUser | null {
    return this._user$.value;
  }

  /**
   * Carga el usuario autenticado desde localStorage.
   * Utilizado al iniciar la aplicación.
   */
  loadCurrentUser(): void {
    try {
      const stored = localStorage.getItem('authUser');
      if (stored) {
        this._user$.next(JSON.parse(stored));
      } else {
        this._user$.next(null);
      }
    } catch {
      this._user$.next(null);
    }
  }
}
