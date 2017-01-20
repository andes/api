"use strict";
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var config = require('./config');
var requireDir = require('require-dir');
var path = require('path');
var app = express();
// Configuración de Mongoose
config.mongooseDebugMode && mongoose.set('debug', true);
mongoose.connect(config.connectionStrings.mongoDB_main);
mongoose.plugin(require('./plugins/defaults'));
// Configura Express
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
// Carga los módulos y rutas
for (var m in config.modules) {
    if (config.modules[m].active) {
        var routes = requireDir(config.modules[m].path);
        for (var route in routes)
            app.use('/api' + config.modules[m].route, routes[route]);
    }
}
// Inicia el servidor
var server = app.listen(3002, function () {
    console.log('Inicio del servidor en el puerto 3002');
});
module.exports = app;
//# sourceMappingURL=index.js.map