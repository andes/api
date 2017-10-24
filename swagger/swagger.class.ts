import * as path from 'path';
import * as swaggerJSDoc from 'swagger-jsdoc';
import * as express from 'express';
import * as configPrivate from '../config.private';

export class Swagger {
    /**
     * Inicializa el middleware de auditoría para JSON Web Token
     *
     * @static
     * @param {express.Express} app aplicación de Express
     *
     * @memberOf Auth
     */
    static initialize(app: express.Express) {
        if (!configPrivate.enableSwagger) {
            return;
        }

        // initialize swagger-jsdoc
        let swagger = swaggerJSDoc({
            swaggerDefinition: {
                info: {
                    title: 'ANDES API',
                    version: '2.0.0',
                    description: 'API para el proyecto ANDES',
                },
                host: '/',
                basePath: '/api',
            },
            // path to the API docs
            apis: [
                // TODO: verificar la documento de las APIs existentes
                // path.join(__dirname, '../core')
                path.join(__dirname, '../core/term/routes/**/*.ts')
            ],
        });

        // serve swagger
        app.get('/swagger.json', function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            res.send(swagger);
        });

        // Incluimos swagger-ui
        app.use('/docs', express.static(__dirname + '/static'));
    }
}
