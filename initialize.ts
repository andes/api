import * as bodyParser from 'body-parser';
import * as config from './config';
import { Auth } from './auth/auth.class';
import { Swagger } from './swagger/swagger.class';
import { Connections } from './connections';
import * as HttpStatus from 'http-status-codes';
import { Express } from 'express';
// import { Scheduler } from './scheduler';

let requireDir = require('require-dir');

export function initAPI(app: Express) {
    // Inicializa la autenticación con Passport/JWT
    Auth.initialize(app);

    // Inicializa Mongoose
    Connections.initialize();

    // Inicializa las tareas diarias
    // Uso el require acá porque genera problemas con los import de schemas antes de setear los defaultsSchema
    // require('./scheduler').Scheduler.initialize();

    // Configura Express
    app.use(bodyParser.json({ limit: '150mb' }));
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.all('*', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

        // Permitir que el método OPTIONS funcione sin autenticación
        if ('OPTIONS' === req.method) {
            res.sendStatus(200);
        } else {
            next();
        }
    });

    // Inicializa Swagger
    Swagger.initialize(app);

    // Carga los módulos y rutas
    for (let m in config.modules) {
        if (config.modules[m].active) {
            let routes = requireDir(config.modules[m].path);
            for (let route in routes) {
                if (config.modules[m].middleware) {
                    app.use('/api' + config.modules[m].route, config.modules[m].middleware, routes[route]);
                } else {
                    app.use('/api' + config.modules[m].route, routes[route]);
                }
            }
        }
    }

    // Error handler
    app.use(function (err: any, req, res, next) {
        if (err) {
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
                    err.status = 500;
                }
            }

            // IMPORTANTE: Express app.get('env') returns 'development' if NODE_ENV is not defined.
            // O sea, la API está corriendo siempre en modo development

            // Send response
            res.status(err.status);
            res.send({
                message: err.message,
                error: (app.get('env') === 'development') ? err : null
            });
        }
    });
}
