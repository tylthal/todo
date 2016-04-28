import {Injectable, EventEmitter} from 'angular2/core';

@Injectable()

export class DataService {
  user_id: string;

  constructor()
  {
  }

  isLoggedIn(callback: Function) : boolean {
    var self = this;
    return true;
  }
}
