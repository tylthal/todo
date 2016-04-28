/// <reference path="../typings/main.d.ts" />

import express = require('express');
import bodyParser = require('body-parser');
import cookieParser = require('cookie-parser');

var port = 8080;
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.use('/node_modules', express.static('./node_modules'));
app.use('/', express.static('./client'));

app.get('/hello', function(req, res) {
  res.send('Hello World.');
});

app.listen(port, function() {
  console.log('Server listening on port %d in %s mode', port, app.settings.env);
})
