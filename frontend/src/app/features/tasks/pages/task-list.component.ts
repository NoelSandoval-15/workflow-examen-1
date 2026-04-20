import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule],
  template: '<div><h2>TaskListComponent</h2></div>'
})
export class TaskListComponent {}
