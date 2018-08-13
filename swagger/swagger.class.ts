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
                    version: '2.6.0',
                    description: 'Documentación del proyecto ANDES',
                },
                host: '/',
                basePath: '/api',
                schemes: ['https'],
                consumes: ['application/json'],
                produces: ['application/json'],
                securityDefinitions: {
                    JWT: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'Authorization'
                    }
                },
            },
            // path to the API docs
            apis: [
                // TODO: verificar la documento de las APIs existentes
                path.join(__dirname, './definitions.yml'),
                // path.join(__dirname, '../core/term/routes/**/*.ts'),
                path.join(__dirname, '../modules/cda/api-doc.yml')
            ],
        });

        // serve swagger
        app.get('/swagger.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(swagger);
        });

        // Incluimos swagger-ui
        app.use('/api/docs', express.static(__dirname + '/static'));
    }
}
