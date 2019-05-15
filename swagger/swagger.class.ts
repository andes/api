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
        const swagger = swaggerJSDoc({
            swaggerDefinition: {
                info: {
                    title: 'Swagger Andes',
                    description: 'Este es un servidor de muestra del servidor de Andes. Puede solicitar su token a info@andes.gob.ar',
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
            apis: [
                path.join(__dirname, './definitions.yml'),
                path.join(__dirname, '../connect/fhir/api-doc.yml'),
                path.join(__dirname, '../modules/cda/api-doc.yml'),
                path.join(__dirname, '../core_v2/mpi/api-doc.yml')
            ],
        });

        // serve swagger
        app.get('/api/swagger.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(swagger);
        });

        // Incluimos swagger-ui
        app.use('/api/docs', express.static(__dirname + '/static'));
    }
}
