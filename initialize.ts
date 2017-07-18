import * as bodyParser from 'body-parser';
import * as mongoose from 'mongoose';
import * as config from './config';
import { Auth } from './auth/auth.class';
import { Swagger } from './swagger';
import { Connections } from './connections';
import * as HttpStatus from 'http-status-codes';
import { Express } from 'express';

//import { snomedDB } from './snomed';
let requireDir = require('require-dir');

export function initAPI(app: Express) {
    // Inicializa la autenticación con Password/JWT
    Auth.initialize(app);

    // Inicializa swagger
    Swagger.initialize(app);

    // Inicializa Mongoose
    Connections.initialize();

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
            res.sendStatus(200);
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

            // Send response
            res.status(err.status);
            res.send({
                message: err.message,
                error: (app.get('env') === 'development') ? err : null
            });
        }
    });
}
