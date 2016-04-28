import {Component, Input} from 'angular2/core';
import {Todo} from '../classes/todo';

@Component({
  selector: 'todo',
  template: `
    <div>
      <span><b>{{todo.title}}</b></span>
      <small>{{todo.description}}</small>
    </div>
  `,
})

export class TodoComponent {
  constructor() {}

  @Input() todo: Todo;
}
