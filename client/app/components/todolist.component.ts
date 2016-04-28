import {Component, OnInit} from 'angular2/core';
import {DataService} from '../services/data.service';
import {Todo} from '../classes/todo';
import {TodoComponent} from './todo.component';

@Component({
  selector: 'todo-list',
  template: `
<div class="panel panel-default" style="margin-left:30px; margin-right:30px;">
  <!-- Default panel contents -->
  <div class="panel-heading">List of Todos</div>

  <!-- List group -->
  <ul class="list-group">
   <li *ngFor="#todo of todos" class="list-group-item"><todo [todo]=todo></todo></li>
  </ul>
</div>

<div class="panel panel-default" style="margin-top:15px; margin-left:30px; margin-right:30px;">
  <div class="panel-heading" >Add a new Todo</div>
  <form (ngSubmit)="addTodo()" style="margin-left=10px;margin-right=10px;">
    <div class="form-group">
      <label for="name">Name</label>
      <input type="text" [(ngModel)]="newTodo.title" class="form-control" required>
    </div>
    <div class="form-group">
      <label for="description">Description</label>
      <input type="text" [(ngModel)]="newTodo.description" class="form-control">
    </div>
    <button type="submit" class="btn btn-default">Submit</button>
  </form>
</div>
 `,
 directives: [TodoComponent]
})

export class TodoListComponent implements OnInit {
  constructor(private _dataService: DataService) {
    this.newTodo = new Todo('', '');
    this.todos = [];
  }

  newTodo: Todo;
  todos: Todo[];

  addTodo() {
    var self = this;
    this._dataService.addTodo(this.newTodo, function(success) {
      if(success) {
        self.newTodo = new Todo('', '');
      }
    });
  }

  ngOnInit() {
    var self = this;
    this._dataService.getTodos(function(results: Todo[]) {
      self.todos = results;
    });
  }
}
