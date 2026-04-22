import { HttpInterceptorFn } from '@angular/common/http';
import { timeout, catchError } from 'rxjs/operators';
import { TimeoutError, throwError } from 'rxjs';

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    timeout(15000),
    catchError(err => {
      if (err instanceof TimeoutError) {
        return throwError(() => ({ status: 0, message: 'La petición tardó demasiado' }));
      }
      return throwError(() => err);
    })
  );
};
