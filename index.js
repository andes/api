"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var requireDir = require('require-dir');
var app = express();
mongoose.connect('mongodb://10.1.62.17/andes');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
var routes = requireDir('./routes/');
for (var route in routes)
    app.use('/api', routes[route]);
var server = app.listen(3000, function () {
    console.log('Inicio web Server local http://127.0.0.1:3000/');
});
//# sourceMappingURL=index.js.map