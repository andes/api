import * as bodyParser from 'body-parser';
import * as mongoose from 'mongoose';
import * as config from './config';
import { Auth } from './auth/auth.class';
import { Swagger } from './swagger';
import * as HttpStatus from 'http-status-codes';
import { schemaDefaults } from './mongoose/defaults';
import { Express } from 'express';

//import { snomedDB } from './snomed';
let requireDir = require('require-dir');

export function initAPI(app: Express) {
    
    // Configuración de Mongoose
    if (config.mongooseDebugMode) {
        mongoose.set('debug', true);
    }
    
    mongoose.connect(config.connectionStrings.mongoDB_main, { db: { bufferMaxEntries: 0 } });
    mongoose.plugin(schemaDefaults);
    mongoose.connection.on('connected', function () {
        console.log('[Mongoose] Conexión OK');
    });
    mongoose.connection.on('error', function (err) {
        console.log('[Mongoose] No se pudo conectar al servidor');
    });
    

    /*
    // conexión hacia snomed
    let snomedDB = mongoose.createConnection(config.connectionStrings.snomed);
    //mongoose.createConnection(config.connectionStrings.snomed);
    //mongoose.connect(config.connectionStrings.snomed);
    
    snomedDB.on('error', function(err){
        if(err) throw err;
    });
    snomedDB.on('connected', function() {  
        console.log('             oo                  ');
        console.log(". . . __/\_/\_/`'                  ");
        console.log('[Mongoose] Conexión SNOMED OK      ');
    });
    */
   

    // Inicializa la autenticación con Password/JWT
    Auth.initialize(app);

    // Inicializa swagger
    Swagger.initialize(app);

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
