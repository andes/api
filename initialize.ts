import * as bodyParser from 'body-parser';
import * as boolParser from 'express-query-boolean';
import * as config from './config';
import * as configPrivate from './config.private';
import { Auth } from './auth/auth.class';
import { Swagger } from './swagger/swagger.class';
import { Connections } from './connections';
import * as HttpStatus from 'http-status-codes';
import { Express, Router } from 'express';
import { AndesDrive } from '@andes/drive';
import { apiOptionsMiddleware, apiOptions } from '@andes/api-tool';

const requireDir = require('require-dir');


export function initAPI(app: Express) {
    // Inicializa la autenticación con Passport/JWT
    Auth.initialize(app);

    // Inicializa Mongoose
    Connections.initialize();

    // Configura Express
    app.use(bodyParser.json({ limit: '150mb' }));
    app.use(boolParser());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(apiOptionsMiddleware);

    app.all('*', (req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

        // Permitir que el método OPTIONS funcione sin autenticación
        if ('OPTIONS' === req.method) {
            res.header('Access-Control-Max-Age', '1728000');
            res.sendStatus(200);
        } else {
            next();
        }
    });
    app.use((req: any, res, next) => {
        req.apiOptions = () => apiOptions(req);
        next();
    });

    // Inicializa Swagger
    Swagger.initialize(app);

    // Carga los módulos y rutas
    for (const m in config.modules) {
        if (config.modules[m].active) {
            const routes = requireDir(config.modules[m].path);
            for (const route in routes) {
                if (config.modules[m].middleware) {
                    app.use('/api' + config.modules[m].route, config.modules[m].middleware, routes[route]);
                } else {
                    app.use('/api' + config.modules[m].route, routes[route]);
                }
            }
        }
    }

    app.use('/api/modules/gestor-usuarios', require('./modules/gestor-usuarios').UsuariosRouter);
    app.use('/api/modules/gestor-usuarios', require('./modules/gestor-usuarios').PerfilesRouter);
    const MPI = require('./core_v2/mpi');
    // const MPI = require('@andes/mpi');
    app.use('/api/core_v2/mpi', MPI.Routing);

    /**
     * Inicializa las rutas para adjuntar archivos
     */
    if (configPrivate.Drive) {
        AndesDrive.setup(configPrivate.Drive);
        const router = Router();
        router.use(Auth.authenticate());
        AndesDrive.install(router);
        app.use('/api/drive', router);
    }

    // Error handler
    app.use((err: any, req, res, next) => {
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
                } else if (!err.status) {
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
