import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as mongoose from 'mongoose';
import * as config from './config';
import { Auth } from './auth/auth.class';

let requireDir = require('require-dir');
let app = express();

// Configuración de Mongoose
if (config.mongooseDebugMode) {
    mongoose.set('debug', false);
}
mongoose.connect(config.connectionStrings.mongoDB_main);
mongoose.plugin(require('./plugins/defaults'));

// Inicializa la autenticación con Password/JWT
Auth.initialize(app);

// Configura Express
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if ('OPTIONS' === req.method) {
        return res.send(200);
    }
    next();
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
    let err = new Error('Not Found');
    (err as any).status = 404;
    next(err);
});

// Error handler
app.use(function (err: any, req, res, next) {
    // Parse err
    let e;
    if (!isNaN(err)) {
        e = new Error(err === 400 ? 'Parámetro incorrecto' : 'No encontrado');
        e.status = err;
        err = e;
    } else if (typeof err === 'string') {
        e = new Error(err);
        e.status = 400;
        err = e;
    }

    // Send HTML or JSON
    res.status(err.status || 500);
    let response = {
        message: err.message,
        error: (app.get('env') === 'development') ? err : null
    };

    if (req.accepts('application/json')) {
        res.send(response);
    } else {
        res.render('error', response);
    }
});


// Inicia el servidor
app.listen(3002, function () {
    console.log('Inicio del servidor en el puerto 3002');
});

export = app;
