import {Injectable, EventEmitter} from 'angular2/core';
import {Todo} from '../classes/todo';

@Injectable()

export class DataService {
  todos: Todo[];

  constructor() {
    this.todos = [];
  }

  isLoggedIn(callback: Function) {
    var self = this;
    $.get("authenticated", function(response: any) {
      if(callback) {
        callback(response.authenticated);
      }
    });
  }

  addTodo(todo: Todo, callback: Function) {
    var self = this;
    $.post("add", todo, function(response: string) {
      todo.id = response;
      self.todos.push(todo);
      callback(true);
    })
  }

  getTodos(callback: Function) {
    var self = this;
    $.get('todos', function(response: Todo[]) {
      self.todos = response;
      callback(self.todos);
    });
  }
}
