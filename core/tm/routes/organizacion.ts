import * as express from 'express';
import * as organizacion from '../schemas/organizacion';
import * as utils from '../../../utils/utils';
import { defaultLimit, maxLimit } from './../../../config';
import * as https from 'https';
import * as configPrivate from '../../../config.private';

let GeoJSON = require('geojson');
let router = express.Router();

router.get('/organizaciones/georef/:id?', function (req, res, next) {
    if (req.params.id) {
        organizacion.model.findById(req.params.id, function (err, data) {
            if (err) {
                console.log('ERROR GET GEOREF:  ', err);
                return next(err);
            }
            let organizacion;
            organizacion = data;
            let dir = organizacion.direccion.valor;
            let localidad = organizacion.direccion.ubicacion.localidad.nombre;
            let provincia = organizacion.direccion.ubicacion.provincia.nombre;
            // let pais = organizacion.direccion.ubicacion.pais;
            let pathGoogleApi = '';
            let jsonGoogle = '';
            pathGoogleApi = '/maps/api/geocode/json?address=' + dir + ',+' + localidad + ',+' + provincia + ',+' + 'AR' + '&key=' + configPrivate.geoKey;

            pathGoogleApi = pathGoogleApi.replace(/ /g, '+');
            pathGoogleApi = pathGoogleApi.replace(/á/gi, 'a');
            pathGoogleApi = pathGoogleApi.replace(/é/gi, 'e');
            pathGoogleApi = pathGoogleApi.replace(/í/gi, 'i');
            pathGoogleApi = pathGoogleApi.replace(/ó/gi, 'o');
            pathGoogleApi = pathGoogleApi.replace(/ú/gi, 'u');
            pathGoogleApi = pathGoogleApi.replace(/ü/gi, 'u');
            pathGoogleApi = pathGoogleApi.replace(/ñ/gi, 'n');

            console.log('PATH CONSULTA GOOGLE API:   ', pathGoogleApi);

            let optionsgetmsg = {
                host: 'maps.googleapis.com',
                port: 443,
                path: pathGoogleApi,
                method: 'GET',
                rejectUnauthorized: false
            };

            if (dir !== '' && localidad !== '' && provincia !== '') {
                let reqGet = https.request(optionsgetmsg, function (res2) {
                    res2.on('data', function (d, error) {
                        jsonGoogle = jsonGoogle + d.toString();
                        console.log('RESPONSE: ', jsonGoogle);
                    });

                    res2.on('end', function () {
                        let salida = JSON.parse(jsonGoogle);
                        if (salida.status === 'OK') {
                            res.json(salida.results[0].geometry.location);
                        } else {
                            res.json('');
                        }
                    });
                });
                req.on('error', (e) => {
                    console.error(e);
                    return next(e);
                });
                reqGet.end();
            } else {
                return next('Datos de dirección incompletos');
            }
        });

    } else {
        let query;
        query = organizacion.model.aggregate([
            {
                '$match': {
                    'direccion.geoReferencia': { $exists: true }
                }
            }, {
                '$project': {
                    '_id': 0,
                    'nombre': '$nombre',
                    'lat': { $arrayElemAt: ['$direccion.geoReferencia', 0] },
                    'lng': { $arrayElemAt: ['$direccion.geoReferencia', 1] }
                }
            }]);
        query.exec(function (err, data) {
            if (err) {
                console.log('ERROR GET GEOREF:  ', err);
                return next(err);
            }
            console.log('DATA:  ', data);
            let geoJsonData = GeoJSON.parse(data, { Point: ['lat', 'lng'], include: ['nombre'] });
            res.json(geoJsonData);
        });
    }
});

/**
 * @swagger
 * definition:
 *   organizacion:
 *     properties:
 *       codigo:
 *          type: object
 *          properties:
 *            sisa:
 *              type: string
 *            cuie:
 *              type: string
 *            remediar:
 *              type: string
 *       nombre:
 *          type: string
 *       tipoEstablecimiento:
 *          type: object
 *          properties:
 *            id:
 *              type: string
 *            nombre:
 *              type: string
 *       telecom:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  tipo:
 *                      type: string
 *                      enum:
 *                          - Teléfono Fijo
 *                          - Teléfono Celular
 *                          - email
 *                  valor:
 *                      type: string
 *                  ranking:
 *                      type: number
 *                      format: float
 *                  ultimaActualizacion:
 *                      type: string
 *                      format: date
 *                  activo:
 *                      type: boolean
 *       direccion:
 *          type: array
 *          items:
 *              $ref: '#/definitions/direccion'
 *       contacto:
 *          type: array
 *          items:
 *              $ref: '#/definitions/contacto'
 *       nivelComplejidad:
 *          type: number
 *          format: float
 *       activo:
 *          type: boolean
 *       fechaAlta:
 *          type: string
 *          format: date
 *       fechaBaja:
 *          type: string
 *          format: date
 */

/**
 * @swagger
 * /organizacion:
 *   get:
 *     tags:
 *       - Organizacion
 *     description: Retorna un arreglo de objetos organizacion
 *     summary: Listar organizaciones
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre o descripción de la organizacion
 *         required: false
 *         type: string
 *       - name: sisa
 *         in: query
 *         description: El codigo sisa de la organizacion
 *         required: true
 *         type: string
 *       - name: skip
 *         in: query
 *         description: El valor numerico del skip
 *         required: false
 *         type: number
 *       - name: limit
 *         in: query
 *         description: El valor del limit
 *         required: false
 *         type: number
 *     responses:
 *       200:
 *         description: un arreglo de objetos organizacion
 *         schema:
 *           $ref: '#/definitions/organizacion'
 * /organizacion/{id}:
 *   get:
 *     tags:
 *       - Organizacion
 *     summary: Listar organizaciones con filtro por ID
 *     description: Retorna un arreglo de objetos organizacion
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de una organizacion
 *         required: true
 *         type: string
 *       - name: tipo
 *         in: query
 *         description: _Id de una organizacion
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: An array of especialidades
 *         schema:
 *           $ref: '#/definitions/organizacion'
 */
router.get('/organizaciones/:id*?', function (req, res, next) {
    if (req.params.id) {
        organizacion.model.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        let act: Boolean = true;
        let filtros = { 'activo': act };
        console.log('query ', req.query);
        if (req.query.nombre) {
            filtros['nombre'] = { '$regex': utils.makePattern(req.query.nombre) };
        }

        if (req.query.cuie) {
            filtros['codigo.cuie'] = { '$regex': utils.makePattern(req.query.cuie) };
        }

        if (req.query.sisa) {
            filtros['codigo.sisa'] = { '$regex': utils.makePattern(req.query.sisa) };
        }
        if (req.query.activo) {
            filtros['activo'] = req.query.activo;
        }

        let skip: number = parseInt(req.query.skip || 0, 10);
        let limit: number = Math.min(parseInt(req.query.limit || defaultLimit, 10), maxLimit);


        query = organizacion.model.find(filtros).skip(skip).limit(limit);
        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

/**
 * @swagger
 * /organizacion:
 *   post:
 *     tags:
 *       - Organizacion
 *     description: Cargar una organizacion
 *     summary: Cargar una organizacion
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: organizacion
 *         description: objeto organizacion
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/organizacion'
 *     responses:
 *       200:
 *         description: Un objeto organizacion
 *         schema:
 *           $ref: '#/definitions/organizacion'
 */
router.post('/organizaciones', function (req, res, next) {
    let newOrganization = new organizacion.model(req.body);
    newOrganization.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newOrganization);
    });
});

/**
 * @swagger
 * /organizacion/{id}:
 *   put:
 *     tags:
 *       - Organizacion
 *     description: Actualizar una organizacion
 *     summary: Actualizar una organizacion
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una organizacion
 *         required: true
 *         type: string
 *       - name: organizacion
 *         description: objeto organizacion
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/organizacion'
 *     responses:
 *       200:
 *         description: Un objeto organizaciones
 *         schema:
 *           $ref: '#/definitions/organizacion'
 */
router.put('/organizaciones/:id', function (req, res, next) {
    console.log('TODO: Reemplazar/validar uso de findByIdAndUpdate');
    organizacion.model.findByIdAndUpdate(req.params.id, req.body, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

/**
 * @swagger
 * /organizacion/{id}:
 *   delete:
 *     tags:
 *       - Organizacion
 *     description: Eliminar una organizacion
 *     summary: Eliminar una organizacion
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una organizacion
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto organizaciones
 *         schema:
 *           $ref: '#/definitions/organizacion'
 */
router.delete('/organizaciones/:id', function (req, res, next) {
    organizacion.model.findByIdAndRemove(req.params._id, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

export = router;
