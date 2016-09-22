"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var requireDir = require('require-dir');
var app = express();
mongoose.connect('mongodb://localhost/andes');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if ('OPTIONS' == req.method) {
        return res.send(200);
    }
    next();
});
var routes = requireDir('./routes/');
for (var route in routes)
    app.use('/api', routes[route]);
var server = app.listen(3002, function () {
    console.log('Inicio web Server local http://127.0.0.1:3002/');
});
module.exports = app;
//# sourceMappingURL=index.js.map