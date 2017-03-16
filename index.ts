import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as mongoose from 'mongoose';
import * as config from './config';
import { Auth } from './auth/auth.class';
import * as HttpStatus from 'http-status-codes';
import { schemaDefaults } from './mongoose/defaults';

// Inicializa express
let requireDir = require('require-dir');
let app = express();

// Configuración de Mongoose
if (config.mongooseDebugMode) {
    mongoose.set('debug', true);
}

mongoose.set('debug', true);

mongoose.connect(config.connectionStrings.mongoDB_main);
mongoose.plugin(schemaDefaults);
mongoose.connection.on('connected', function () {
    console.log('Mongoose connect');
});
mongoose.connection.on('error', function (err) {
    console.log('Mongoose error: ' + err);
});

// Inicializa la autenticación con Password/JWT
Auth.initialize(app);

// Configura Express
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    // Permitir que el método OPTIONS funcione sin autenticación
    if ('OPTIONS' === req.method) {
        res.send(200);
    } else {
        next();
    }
});


// Carga los módulos y rutas
for (let m in config.modules) {
    if (config.modules[m].active) {
        let routes = requireDir(config.modules[m].path);
        for (let route in routes) {
            if (config.modules[m].auth) {
                app.use('/api' + config.modules[m].route, Auth.authenticate(), routes[route]);
            } else {
                app.use('/api' + config.modules[m].route, routes[route]);
            }
        }
    }
}

// Not found: catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(404);
});

// Error handler
app.use(function (err: any, req, res, next) {
    // Parse err
    let e: Error;
    if (!isNaN(err)) {
        e = new Error(HttpStatus.getStatusText(err));
        (e as any).status = err;
        err = e;
    } else {
        if (typeof err === 'string') {
            e = new Error(err);
            (e as any).status = 400;
            err = e;
        } else {
            e = new Error(HttpStatus.getStatusText(500));
            (e as any).status = 500;
            err = e;
        }
    }

    // Send HTML or JSON
    let response = {
        message: err.message,
        error: (app.get('env') === 'development') ? err : null
    };

    if (req.accepts('application/json')) {
        res.status(err.status);
        res.send(response);
    } else {
        res.status(err.status);
        res.render('error', response);
    }
});


// Inicia el servidor
app.listen(3002, function () {
    console.log('Inicio del servidor en el puerto 3002');
});
export = app;
