import * as express from 'express';
import * as https from 'https';

import { model as organizacion } from '../schemas/organizacion';

import * as utils from '../../../utils/utils';
import { toArray } from '../../../utils/utils';
import { defaultLimit, maxLimit } from './../../../config';

import * as configPrivate from '../../../config.private';
import { Auth } from '../../../auth/auth.class';

const GeoJSON = require('geojson');
const router = express.Router();


router.get('/organizaciones/georef/:id?', async (req, res, next) => {
    if (req.params.id) {
        organizacion
            .findById(req.params.id, (err, data: any) => {
                if (err) {
                    return next(err);
                }
                const dir = data.direccion.valor;
                const localidad = data.direccion.ubicacion.localidad.nombre;
                const provincia = data.direccion.ubicacion.provincia.nombre;
                // let pais = organizacion.direccion.ubicacion.pais;
                let pathGoogleApi = '';
                let jsonGoogle = '';
                pathGoogleApi = '/maps/api/geocode/json?address=' + dir + ',+' + localidad + ',+' + provincia + ',+AR&key=' + configPrivate.geoKey;

                pathGoogleApi = pathGoogleApi.replace(/ /g, '+');
                pathGoogleApi = pathGoogleApi.replace(/á/gi, 'a');
                pathGoogleApi = pathGoogleApi.replace(/é/gi, 'e');
                pathGoogleApi = pathGoogleApi.replace(/í/gi, 'i');
                pathGoogleApi = pathGoogleApi.replace(/ó/gi, 'o');
                pathGoogleApi = pathGoogleApi.replace(/ú/gi, 'u');
                pathGoogleApi = pathGoogleApi.replace(/ü/gi, 'u');
                pathGoogleApi = pathGoogleApi.replace(/ñ/gi, 'n');

                const optionsgetmsg = {
                    host: 'maps.googleapis.com',
                    port: 443,
                    path: pathGoogleApi,
                    method: 'GET',
                    rejectUnauthorized: false
                };

                if (dir !== '' && localidad !== '' && provincia !== '') {
                    const reqGet = https.request(optionsgetmsg, (res2) => {
                        res2
                            .on('data', (d, error) => {
                                jsonGoogle = jsonGoogle + d.toString();
                            });

                        res2.on('end', () => {
                            const salida = JSON.parse(jsonGoogle);
                            if (salida.status === 'OK') {
                                res.json(salida.results[0].geometry.location);
                            } else {
                                res.json('');
                            }
                        });
                    });
                    req.on('error', (e) => {
                        return next(e);
                    });
                    reqGet.end();
                } else {
                    return next('Datos de dirección incompletos');
                }
            });

    } else {
        const query = organizacion.aggregate([
            {
                $match: {
                    'direccion.geoReferencia': {
                        $exists: true
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    nombre: '$nombre',
                    lat: {
                        $arrayElemAt: ['$direccion.geoReferencia', 0]
                    },
                    lng: {
                        $arrayElemAt: ['$direccion.geoReferencia', 1]
                    }
                }
            }
        ])
            .cursor({})
            .exec();

        const data = await toArray(query);
        const geoJsonData = GeoJSON.parse(data, {
            Point: [
                'lat', 'lng'
            ],
            include: ['nombre']
        });
        res.json(geoJsonData);
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
router.get('/organizaciones/:id*?', (req, res, next) => {
    if (req.params.id) {
        organizacion
            .findById(req.params.id, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
    } else {
        let query;
        const act: Boolean = true;
        const filtros = {
            activo: act
        };

        if (req.query.nombre) {
            filtros['nombre'] = {
                $regex: utils.makePattern(req.query.nombre)
            };
        }

        if (req.query.cuie) {
            filtros['codigo.cuie'] = {
                $regex: utils.makePattern(req.query.cuie)
            };
        }

        if (req.query.sisa) {
            filtros['codigo.sisa'] = {
                $regex: utils.makePattern(req.query.sisa)
            };
        }
        if (req.query.activo) {
            filtros['activo'] = req.query.activo;
        }
        if (req.query.tipoEstablecimiento) {
            filtros['tipoEstablecimiento.nombre'] = {
                $regex: utils.makePattern(req.query.tipoEstablecimiento)
            };
        }
        if (req.query.ids) {
            filtros['_id'] = { $in: req.query.ids };
        }

        const skip: number = parseInt(req.query.skip || 0, 10);
        const limit: number = Math.min(parseInt(req.query.limit || defaultLimit, 10), maxLimit);

        query = organizacion
            .find(filtros);
        // .skip(skip)
        // .limit(limit);
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });

        // if (req.query.nombre) {
        //     filtros['nombre'] = { '$regex': utils.makePattern(req.query.nombre) };
        // }

        // if (req.query.cuie) {
        //     filtros['codigo.cuie'] = { '$regex': utils.makePattern(req.query.cuie) };
        // }

        // if (req.query.sisa) {
        //     filtros['codigo.sisa'] = { '$regex': utils.makePattern(req.query.sisa) };
        // }
        // if (req.query.activo) {
        //     filtros['activo'] = req.query.activo;
        // }
        // if (req.query.tipoEstablecimiento) {
        //     filtros['tipoEstablecimiento.nombre'] = {'$regex': utils.makePattern(req.query.tipoEstablecimiento) };
        // }


        // query.exec (err, data) => {
        //     if (err) {
        //         return next(err);
        //     }
        //     res.json(data);
        // });
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
 * Auth.audit(newPatientMpi, req)
 */
router.post('/organizaciones', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'tm:especialidad:postEspecialidad')) {
        return next(403);
    }
    const newOrganization = new organizacion(req.body);
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
router.put('/organizaciones/:id', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'tm:organizacion:edit')) {
        return next(403);
    }
    organizacion.findByIdAndUpdate(req.params.id, req.body, (err, data) => {
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
router.delete('/organizaciones/:id', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'tm:organizacion:delete')) {
        return next(403);
    }
    organizacion.findByIdAndRemove(req.params._id, (err, data) => {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});


export = router;
