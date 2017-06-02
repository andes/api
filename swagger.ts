import * as path from 'path';
import * as swaggerJSDoc from 'swagger-jsdoc';
import * as express from 'express';
import * as passport from 'passport';
import * as configPrivate from './config.private';

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

        // Configura passport para que utilice JWT
        // swagger definition
        let swaggerDefinition = {
            info: {
                title: 'API ANDES',
                version: '1.0.0',
                description: 'APIs de tablas maestras ANDES',
            },
            host: '10.1.62.17',
            basePath: '/api',
            definitions: {
                'referencia': {
                    'type': 'object',
                    'properties': {
                        'id':
                        { 'type': 'string' },
                        'nombre':
                        { 'type': 'string' }
                    }
                },
                'ubicacion': {
                    'type': 'object',
                    'properties': {
                        'barrio': {
                            $ref: '#/definitions/referencia'
                        },
                        'localidad': {
                            $ref: '#/definitions/referencia'
                        },
                        'provincia': {
                            $ref: '#/definitions/referencia'
                        },
                        'pais': {
                            $ref: '#/definitions/referencia'
                        }
                    }
                },
                'direccion': {
                    'type': 'object',
                    'properties': {
                        'valor':
                        { 'type': 'string' },
                        'codigoPostal':
                        { 'type': 'string' },
                        'ubicacion': {
                            $ref: '#/definitions/ubicacion'
                        },
                        'ranking':
                        { 'type': 'number' },
                        'geoReferencia':
                        {
                            'type': 'array',
                            'items': { 'type': 'number' }
                        },
                        'ultimaActualizacion':
                        { 'type': 'string', 'format': 'date' },
                        'activo':
                        { 'type': 'boolean' }
                    }
                },
                'contacto': {
                    'type': 'object',
                    'properties': {
                        'proposito':
                        { 'type': 'String' },
                        'nombre':
                        { 'type': 'String' },
                        'apellido':
                        { 'type': 'String' },
                        'tipo':
                        {
                            'type': 'String',
                            'enum': ['Teléfono Fijo', 'Teléfono Celular', 'Email']
                        },
                        'valor':
                        { 'type': 'string' },
                        'activo':
                        { 'type': 'boolean' }
                    }
                }
            }
        };

        // options for the swagger docs
        let options = {
            // import swaggerDefinitions
            swaggerDefinition: swaggerDefinition,
            // path to the API docs
            apis: [path.join(__dirname, '/core/mpi/routes/paciente.ts')],

        };

        // initialize swagger-jsdoc
        let swaggerSpec = swaggerJSDoc(options);

        // serve swagger
        app.get('/swagger.json', function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            res.send(swaggerSpec);
        });

        // Incluimos swagger-ui
        app.use('/api-docs', express.static(__dirname + '/api-docs'));

        // Inicializa passport
        app.use(passport.initialize());
    }
}
