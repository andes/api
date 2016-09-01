"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var router = require('./establecimiento');
var app = express();
mongoose.connect('mongodb://10.1.62.17/andes');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use('/api', router);
var server = app.listen(3000, function () {
    console.log('Inicio web Server local http://127.0.0.1:3000/');
});
//# sourceMappingURL=index.js.map