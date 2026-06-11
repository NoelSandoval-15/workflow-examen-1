import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentEditor } from './document-editor';

describe('DocumentEditor', () => {
  let component: DocumentEditor;
  let fixture: ComponentFixture<DocumentEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
