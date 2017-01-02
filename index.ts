import * as http from "http";
import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as mongoose from 'mongoose'


var requireDir = require('require-dir');
var swaggerJSDoc = require('swagger-jsdoc');
var path = require('path');
var app = express();
var config = require('./config');

mongoose.connect('mongodb://localhost/andes')
//mongoose.connect('mongodb://10.1.62.17/andes');
mongoose.plugin(require('./plugins/defaults'));
// swagger definition
var swaggerDefinition = {
    info: {
        title: 'API ANDES',
        version: '1.0.0',
        description: 'APIs de tablas maestras ANDES',
    },
    host: '10.1.62.17:3002',                                                                
    basePath: '/api',
    definitions: {
        "referencia": {
            "type": "object",
            "properties": {
                "id":
                { "type": "string" },
                "nombre":
                { "type": "string" }
            }
        },
        "ubicacion": {
            "type": "object",
            "properties": {
                "barrio": {
                    $ref: '#/definitions/referencia'
                },
                "localidad": {
                    $ref: '#/definitions/referencia'
                },
                "provincia": {
                    $ref: '#/definitions/referencia'
                },
                "pais": {
                    $ref: '#/definitions/referencia'
                }
            }
        },
        "direccion": {
            "type": "object",
            "properties": {
                "valor":
                { "type": "string" },
                "codigoPostal":
                { "type": "string" },
                "ubicacion": {
                    $ref: '#/definitions/ubicacion'
                },
                "ranking":
                { "type": "number" },
                "geoReferencia":
                {
                    "type": "array",
                    "items": { "type": "number" }
                },
                "ultimaActualizacion":
                { "type": "string", "format": "date" },
                "activo":
                { "type": "boolean" }
            }
        },
        "contacto": {
            "type": "object",
            "properties": {
                "proposito":
                { "type": "String" },
                "nombre":
                { "type": "String" },
                "apellido":
                { "type": "String" },
                "tipo":
                {
                    "type": "String",
                    "enum": ["Teléfono Fijo", "Teléfono Celular", "Email"]
                },
                "valor":
                { "type": "string" },
                "activo":
                { "type": "boolean" }
            }
        }
    }

};

// options for the swagger docs
var options = {
    // import swaggerDefinitions
    swaggerDefinition: swaggerDefinition,
    // path to the API docs
    apis: [path.join(__dirname, '/routes/*.js')],

};

// initialize swagger-jsdoc
var swaggerSpec = swaggerJSDoc(options);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if ('OPTIONS' == req.method) {
        return res.send(200);
    }
    next();
});

//leo el archivo de configuracion

//var routes = requireDir('./routes/');
var routes = requireDir(config.routesRoot);
for (var route in routes)
    app.use('/api', routes[route]);

if (config.turnos.habilitado) {
    var routes = requireDir(config.turnos.route);
    for (var route in routes)
        app.use(config.turnos.rutaAPI, routes[route]);
}

//serve swagger
app.get('/swagger.json', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

//Incluimos swagger-ui
app.use('/api-docs', express.static(__dirname + '/api-docs'));

var server = app.listen(3002, function () {
    console.log('Inicio web Server local http://10.1.62.17:3002/');
});

export = app