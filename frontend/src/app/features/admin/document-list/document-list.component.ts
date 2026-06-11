import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DocumentService, Documento } from '../services/document.service';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';
import { AuthService, AuthUser } from '../../../core/services/auth.service';
@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, SafeUrlPipe],
  templateUrl: './document-list.component.html',
  styleUrl: './document-list.component.scss',
})
export class DocumentListComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  documents: Documento[] = [];
  filteredDocuments: Documento[] = [];
  
  // Search & Filter
  searchTerm: string = '';
  selectedFilter: string = 'All';

  // Grouped Documents by Uploader
  selectedGroupUploader: string = '';

  get groupedDocuments(): { uploader: string; docs: Documento[]; expanded: boolean }[] {
    const groups = new Map<string, Documento[]>();
    for (const doc of this.filteredDocuments) {
      const uploader = doc.subidoPorId || 'Desconocido';
      if (!groups.has(uploader)) {
        groups.set(uploader, []);
      }
      groups.get(uploader)!.push(doc);
    }
    
    // Convert to array of objects
    const arr = Array.from(groups.entries()).map(([uploader, docs]) => ({
      uploader,
      docs,
      expanded: true
    })).sort((a, b) => a.uploader.localeCompare(b.uploader));

    if (this.selectedGroupUploader === '' && arr.length > 0) {
      this.selectedGroupUploader = arr[0].uploader;
    } else if (arr.length > 0 && !arr.some(g => g.uploader === this.selectedGroupUploader)) {
      this.selectedGroupUploader = arr[0].uploader;
    }

    return arr;
  }

  get selectedGroup() {
    return this.groupedDocuments.find(g => g.uploader === this.selectedGroupUploader);
  }

  selectGroup(uploader: string) {
    this.selectedGroupUploader = uploader;
  }

  // Stats
  totalDocsCount: number = 0;
  recentDocsCount: number = 0;
  uniqueTypesCount: number = 0;

  // OnlyOffice Edit State
  isEditing: boolean = false;
  private currentUser: AuthUser | null = null;
  editingDoc: Documento | null = null;

  // Preview Modal
  isPreviewing: boolean = false;
  previewUrl: string = '';
  previewDocName: string = '';

  // Mock data matching the prototype to show if backend returns empty list
  private mockDocuments: Documento[] = [
    {
      id: 'mock-1',
      procesoInstanciaId: 'TRM-3AB5CCFD',
      tareaId: 'task-1',
      subidoPorId: 'Joan Marins',
      nombreArchivo: 'contract_1.pdf',
      ruta: '',
      mimeType: 'application/pdf',
      extension: 'pdf',
      tamanoBytes: 154200,
      esEvidencia: true,
      descripcion: 'Contrato laboral firmado',
      createdAt: '2023-06-21T10:00:00'
    },
    {
      id: 'mock-2',
      procesoInstanciaId: 'TRM-CA0F8512',
      tareaId: 'task-2',
      subidoPorId: 'Joan Marins',
      nombreArchivo: 'report_v2.docx',
      ruta: '',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
      tamanoBytes: 45200,
      esEvidencia: false,
      descripcion: 'Informe de avance trimestral',
      createdAt: '2023-06-21T11:30:00'
    },
    {
      id: 'mock-3',
      procesoInstanciaId: 'TRM-1C35622C',
      tareaId: 'task-3',
      subidoPorId: 'Joan Marins',
      nombreArchivo: 'budget.xlsx',
      ruta: '',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
      tamanoBytes: 89000,
      esEvidencia: true,
      descripcion: 'Presupuesto anual detallado',
      createdAt: '2023-06-21T14:15:00'
    },
    {
      id: 'mock-4',
      procesoInstanciaId: 'TRM-64D9B859',
      tareaId: 'task-4',
      subidoPorId: 'Joan Marins',
      nombreArchivo: 'budget.xlsx',
      ruta: '',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
      tamanoBytes: 89000,
      esEvidencia: true,
      descripcion: 'Presupuesto de respaldo',
      createdAt: '2023-06-21T16:00:00'
    },
    {
      id: 'mock-5',
      procesoInstanciaId: '-',
      tareaId: '',
      subidoPorId: 'Joan Marins',
      nombreArchivo: 'imagen_compid1.jpg',
      ruta: '',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      tamanoBytes: 1250000,
      esEvidencia: false,
      descripcion: 'Evidencia fotográfica',
      createdAt: '2023-06-27T09:00:00'
    },
    {
      id: 'mock-6',
      procesoInstanciaId: '-',
      tareaId: '',
      subidoPorId: 'Joan Marins',
      nombreArchivo: 'reptont_v2.jpg',
      ruta: '',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      tamanoBytes: 980000,
      esEvidencia: false,
      descripcion: 'Evidencia fotográfica 2',
      createdAt: '2023-06-27T10:30:00'
    }
  ];

  private authService = inject(AuthService);

  constructor(
    private docService: DocumentService,
    private router: Router
  ) {}

  
  ngOnInit() {
    // Cargar datos del usuario autenticado
    this.authService.loadCurrentUser();
        this.authService.user$.subscribe((u: AuthUser | null) => this.currentUser = u);
    this.loadDocuments();
  }

  loadDocuments() {
    this.docService.listarTodos().subscribe({
      next: (data) => {
        // If backend has no files, populate mock files so the screen matches the prototype
        if (!data || data.length === 0) {
          this.documents = [...this.mockDocuments];
        } else {
          // Merge mock documents and backend documents
          this.documents = [...data];
        }
        this.applyFilterAndSearch();
        this.calculateStats();
        this.cdr.detectChanges(); // <-- Forzar renderizado
      },
      error: (err) => {
        console.error('Error loading documents, using mock data:', err);
        this.documents = [...this.mockDocuments];
        this.applyFilterAndSearch();
        this.calculateStats();
        this.cdr.detectChanges(); // <-- Forzar renderizado
      }
    });
  }


  calculateStats() {
    this.totalDocsCount = this.documents.length;
    
    // Recent docs: uploaded in the last 14 days or just a custom logic for this demo
    const now = new Date();
    this.recentDocsCount = this.documents.filter(d => {
      const created = new Date(d.createdAt);
      const diffTime = Math.abs(now.getTime() - created.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30; // Let's say within 30 days
    }).length;

    // Unique extensions
    const types = new Set(this.documents.map(d => d.extension.toLowerCase()));
    this.uniqueTypesCount = types.size;
  }

  applyFilterAndSearch() {
    this.filteredDocuments = this.documents.filter(doc => {
      // Search match
      const matchesSearch = doc.nombreArchivo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            (doc.procesoInstanciaId && doc.procesoInstanciaId.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
                            doc.subidoPorId.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      // Filter match
      if (this.selectedFilter === 'All') {
        return matchesSearch;
      }
      
      const ext = doc.extension.toLowerCase();
      if (this.selectedFilter === 'PDF') {
        return matchesSearch && ext === 'pdf';
      } else if (this.selectedFilter === 'Word') {
        return matchesSearch && ['doc', 'docx', 'odt'].includes(ext);
      } else if (this.selectedFilter === 'Excel') {
        return matchesSearch && ['xls', 'xlsx', 'ods'].includes(ext);
      } else if (this.selectedFilter === 'Imagen') {
        return matchesSearch && ['jpg', 'jpeg', 'png', 'gif'].includes(ext);
      }
      
      return matchesSearch;
    });
  }

  onSearchChange() {
    this.applyFilterAndSearch();
  }

  onFilterChange(filter: string) {
    this.selectedFilter = filter;
    this.applyFilterAndSearch();
  }

  // Actions
  visualizar(doc: Documento) {
    if (doc.id.startsWith('mock-')) {
      alert(`Visualizando prototipo: ${doc.nombreArchivo}. En un archivo real, esto abriría el visor de PDF o imagen.`);
      return;
    }
    
    const ext = doc.extension.toLowerCase();
    if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt'].includes(ext)) {
      this.previewDocName = doc.nombreArchivo;
      this.previewUrl = this.docService.getViewUrl(doc.id);
      this.isPreviewing = true;
    } else {
      // For office files, we can edit/view in OnlyOffice
      this.editar(doc);
    }
  }

  closePreview() {
    this.isPreviewing = false;
    this.previewUrl = '';
    this.previewDocName = '';
  }

  descargar(doc: Documento) {
    if (doc.id.startsWith('mock-')) {
      alert(`Descargando prototipo: ${doc.nombreArchivo}`);
      return;
    }
    this.docService.downloadFile(doc.id, doc.nombreArchivo);
  }

  loadOnlyOfficeScript(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).DocsAPI) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'http://localhost:8081/web-apps/apps/api/documents/api.js';
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  editar(doc: Documento) {
    if (doc.id.startsWith('mock-')) {
      alert(`Editando prototipo: ${doc.nombreArchivo}`);
      return;
    }

    const ext = doc.extension.toLowerCase();
    if (!['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
      alert('Formato no soportado para edición.');
      return;
    }

    // Navegar a la página de edición con el documento en el estado
    this.router.navigate(['/admin/editor', doc.id], { state: { document: doc } });
  }

  closeOnlyOffice() {
    this.isEditing = false;
    this.editingDoc = null;
    this.loadDocuments();
  }

  getDocumentType(ext: string): string {
    if (['docx', 'doc', 'odt', 'rtf', 'txt'].includes(ext)) return 'word';
    if (['xlsx', 'xls', 'ods', 'csv'].includes(ext)) return 'cell';
    if (['pptx', 'ppt', 'odp'].includes(ext)) return 'slide';
    return 'word';
  }

  eliminar(doc: Documento) {
    if (confirm(`¿Estás seguro de que deseas eliminar el archivo "${doc.nombreArchivo}"?`)) {
      if (doc.id.startsWith('mock-')) {
        this.documents = this.documents.filter(d => d.id !== doc.id);
        this.applyFilterAndSearch();
        this.calculateStats();
        return;
      }
      
      this.docService.eliminar(doc.id).subscribe({
        next: () => {
          this.loadDocuments();
        },
        error: (err) => {
          console.error('Error al eliminar:', err);
          alert('Error al eliminar el archivo.');
        }
      });
    }
  }

  getFileIcon(ext: string): string {
    const e = ext.toLowerCase();
    if (e === 'pdf') return 'description';
    if (['doc', 'docx'].includes(e)) return 'article';
    if (['xls', 'xlsx'].includes(e)) return 'table_chart';
    if (['png', 'jpg', 'jpeg', 'gif'].includes(e)) return 'image';
    return 'insert_drive_file';
  }

  getFileIconColor(ext: string): string {
    const e = ext.toLowerCase();
    if (e === 'pdf') return '#e74c3c'; // red
    if (['doc', 'docx'].includes(e)) return '#2980b9'; // blue
    if (['xls', 'xlsx'].includes(e)) return '#27ae60'; // green
    if (['png', 'jpg', 'jpeg', 'gif'].includes(e)) return '#e67e22'; // orange
    return '#7f8c8d'; // grey
  }

  /** Abre el selector de archivo oculto */
  triggerFileInput(): void {
    const input = document.getElementById('fileUpload') as HTMLInputElement;
    input?.click();
  }

  /** Maneja la selección del archivo y lo sube */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file: File = input.files[0];
    // TODO: sustituir por el ID real de la instancia de proceso
    const instanceId = 'TRM-XXXX';
    this.docService.uploadFile(instanceId, file).subscribe({
      next: (dto: Documento) => {
        // Insertamos el nuevo documento al inicio de la lista
        this.documents = [dto, ...this.documents];
        this.applyFilterAndSearch();
        this.calculateStats();
        this.cdr.detectChanges(); // <-- Forzar renderizado
      },
      error: (err: any) => {
        console.error('Error al subir', err);
        alert('Error al subir el archivo.');
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }
}
