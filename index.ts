import * as http from 'http';
import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as mongoose from 'mongoose'
import * as config from './config';

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
for (let m in config.modules) {
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

export = app