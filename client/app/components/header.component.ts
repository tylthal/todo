import {Component, OnInit} from 'angular2/core';
import {DataService} from '../services/data.service';

@Component({
  selector: 'app-header',
  templateUrl: './app/templates/header.component.html',
  styleUrls: ['./app/styles/header.component.css']
})

export class HeaderComponent implements OnInit {
  constructor(private _dataService: DataService) {}

  ngOnInit() {
            }
}
