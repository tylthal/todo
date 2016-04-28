import {Component, OnInit} from 'angular2/core';
import {DataService} from '../services/data.service';

@Component({
    selector: 'my-app',
    templateUrl: './app/templates/app.component.html',
    styleUrls: [
      './app/styles/app.component.css'
    ],
    providers: [DataService],
})

export class AppComponent implements OnInit {
    loggedIn = false;

    constructor(private _dataService: DataService) { }

    ngOnInit() {
      var self = this;
      this._dataService.isLoggedIn(function(response) {
        self.loggedIn = response;
      });
    }
}
