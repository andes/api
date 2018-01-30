// import { mapaDeCama } from './../schemas/mapaDeCama';
import * as express from 'express';
import * as https from 'https';

import * as organizacion from '../schemas/organizacion';

import * as utils from '../../../utils/utils';
import {toArray} from '../../../utils/utils';
import {defaultLimit, maxLimit} from './../../../config';

import * as configPrivate from '../../../config.private';
import {Auth} from '../../../auth/auth.class';
// import * as estadoCama from '../routes/camaEstado';
// import {camaEstado} from './../schemas/camaEstado';
import * as CamaEstadoModel from '../models/camaEstado';

let GeoJSON = require('geojson');
let router = express.Router();

/**
 * Busca la cama por su id.
 */

router.get('/organizaciones/:id/camas/:idCama', function (req, res, next) {
    organizacion
        .model
        .findOne({
            _id: req.params.id,
            'camas._id': req.params.idCama
        }, function (err, data: any) {
            if (err) {
                return next(err);
            }
            const index = data
                .camas
                .findIndex(cama => cama._id.toString() === req.params.idCama);
            if (index === -1) {
                return next(new Error('Cama no encontrada'));
            }
            res.json(data.camas[index]);
        });
});

/**
//  * busca las camas de una organizacion, por defecto trae todas o se
//  * pueden filtrar por estado o habitacion.
//  */

router.get('/organizaciones/:id/camas', function (req, res, next) {

    let query;
    query = organizacion
        .model
        .findOne({_id: req.params.id});
    if (req.query.estado) {
        query
            .where('camas.estado')
            .equals(req.query.estado);
    }
    if (req.query.habitacion) {
        query
            .where('camas.habitacion')
            .equals(req.query.habitacion);
    }
    query.sort({'camas.numero': 1, 'camas.habitacion': 1});
    query.exec({}, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data.camas);
    });
});

router.get('/organizaciones/georef/:id?', async function (req, res, next) {
    if (req.params.id) {
        organizacion
            .model
            .findById(req.params.id, function (err, data: any) {
                if (err) {
                    return next(err);
                }
                let dir = data.direccion.valor;
                let localidad = data.direccion.ubicacion.localidad.nombre;
                let provincia = data.direccion.ubicacion.provincia.nombre;
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

                let optionsgetmsg = {
                    host: 'maps.googleapis.com',
                    port: 443,
                    path: pathGoogleApi,
                    method: 'GET',
                    rejectUnauthorized: false
                };

                if (dir !== '' && localidad !== '' && provincia !== '') {
                    let reqGet = https.request(optionsgetmsg, function (res2) {
                        res2
                            .on('data', function (d, error) {
                                jsonGoogle = jsonGoogle + d.toString();
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
                        return next(e);
                    });
                    reqGet.end();
                } else {
                    return next('Datos de dirección incompletos');
                }
            });

    } else {
        let query = organizacion
            .model
            .aggregate([
                {
                    '$match': {
                        'direccion.geoReferencia': {
                            $exists: true
                        }
                    }
                }, {
                    '$project': {
                        '_id': 0,
                        'nombre': '$nombre',
                        'lat': {
                            $arrayElemAt: ['$direccion.geoReferencia', 0]
                        },
                        'lng': {
                            $arrayElemAt: ['$direccion.geoReferencia', 1]
                        }
                    }
                }
            ])
            .cursor({})
            .exec();

        let data = await toArray(query);
        let geoJsonData = GeoJSON.parse(data, {
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
router.get('/organizaciones/:id*?', function (req, res, next) {
    if (req.params.id) {
        organizacion
            .model
            .findById(req.params.id, function (err, data) {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
    } else {
        let query;
        let act: Boolean = true;
        let filtros = {
            'activo': act
        };

        if (req.query.nombre) {
            filtros['nombre'] = {
                '$regex': utils.makePattern(req.query.nombre)
            };
        }

        if (req.query.cuie) {
            filtros['codigo.cuie'] = {
                '$regex': utils.makePattern(req.query.cuie)
            };
        }

        if (req.query.sisa) {
            filtros['codigo.sisa'] = {
                '$regex': utils.makePattern(req.query.sisa)
            };
        }
        if (req.query.activo) {
            filtros['activo'] = req.query.activo;
        }
        if (req.query.tipoEstablecimiento) {
            filtros['tipoEstablecimiento.nombre'] = {
                '$regex': utils.makePattern(req.query.tipoEstablecimiento)
            };
        }

        let skip: number = parseInt(req.query.skip || 0, 10);
        let limit: number = Math.min(parseInt(req.query.limit || defaultLimit, 10), maxLimit);

        query = organizacion
            .model
            .find(filtros)
            .skip(skip)
            .limit(limit);
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
    organizacion
        .model
        .findByIdAndUpdate(req.params.id, req.body, function (err, data) {
            if (err) {
                return next(err);
            }

            res.json(data);
        });
});

router.patch('/organizaciones/:id/camas/:idCama', function (req, res, next) {
    organizacion
        .model
        .findOne({
            _id: req.params.id,
            'camas._id': req.params.idCama
        }, function (err, data: any) {
            if (err) {
                return next(err);
            }

            let copiaData = data;
            let indexCama = data.camas.findIndex(cama => cama._id.toString() === req.params.idCama);

            switch (req.body.op) {
                case 'editCama':
                    if (req.body.editCama) {
                        data.camas[indexCama] = req.body.editCama;
                    }
                    break;
                case 'sector':
                    if (req.body.sector) {
                        data.camas[indexCama].sector = req.body.sector;
                    }
                    break;
                case 'habitacion':
                    if (req.body.habitacion) {
                        data.camas[indexCama].habitacion = req.body.habitacion;
                    }
                    break;
                case 'numero':
                    if (req.body.numero) {
                        data.camas[indexCama].numero = req.body.numero;
                    }
                    break;
                case 'servicio':
                    if (req.body.servicio) {
                        data.camas[indexCama].servicio = req.body.servicio;
                    }
                    break;
                case 'tipoCama':
                    if (req.body.tipoCama) {
                        data.camas[indexCama].tipoCama = req.body.tipoCama;
                    }
                    break;
                case 'equipamiento':
                    if (req.body.equipamiento) {
                        data
                            .camas[indexCama]['equipamiento']
                            .push(req.body.equipamiento);
                    }
                    break;
                case 'estado':
                    if (req.body.estado) {
                        // data.camas[indexCama].ultimoEstado = req.body.estado;
                        // this.estadoCama.create(req.body.objEstado); ver cambio.. objEstado no esta
                        // mas.
                        // req.body.estado.idCama = data.camas[indexCama]._id;
                    }
                    break;
                case 'paciente':
                    if (req.body.paciente) {
                        data.camas[indexCama].paciente = req.body.paciente;
                    }
                    break;
                case 'observaciones':
                    if (req.body.observaciones) {
                        data.camas[indexCama].observaciones = req.body.observaciones;
                    }
                    break;
                default:
                    return next(500);
            }

            // if (validaCama(copiaData.camas, data.camas[indexCama])) {
            //     return next('Ya existe la cama, no se puede editar');
            // }
            if (req.body.estado) {
                CamaEstadoModel.crear(req.body.estado, req).then(estado => {
                    data.camas[indexCama].ultimoEstado = estado;

                    // agregamos audit a la cama
                    Auth.audit(data.camas[indexCama], req);
                    // agregamos audit a la organizacion
                    Auth.audit(data, req);
                    // guardamos organizacion
                    data.save((errUpdate) => {

                        if (errUpdate) {
                            return next(errUpdate);
                        }

                        res.json(data.camas[indexCama]);
                    });

                }).catch(errorCreate => {
                    return next(errorCreate);
                });
            } else {
                // agregamos audit a la organizacion
                Auth.audit(data, req);
                // guardamos organizacion
                data.save((errUpdate) => {
                    if (errUpdate) {
                        return next(errUpdate);
                    }

                    res.json(data.camas[indexCama]);
                });

            }
        });
});

/**
 * Agrega una nueva cama a la organizacion.
 */

router.patch('/organizaciones/:id/camas', (req, res, next) => {
    organizacion.model.findOne({ _id: req.params.id }, (err, data: any) => {

        if (err) {
            return next(err);
        }

        switch (req.body.op) {
            case 'newCama':
                if ((req.body.newCama) && validaCama(data.camas, req.body.newCama)) {
                    return next('No se puede agregar la cama porque ya existe');
                }

                data.camas.push(req.body.newCama);
                Auth.audit(data.camas[data.camas.length - 1], req);

            break;

            default:
            return next(500);
        }

        // console.log(data.camas[data.camas.length - 1], 'asdasd');
        Auth.audit(data, req);

        data.camas[data.camas.length - 1].ultimoEstado.idCama = data.camas[data.camas.length - 1]._id;
        data.camas[data.camas.length - 1].ultimoEstado['createdAt'] = data.createdAt;
        data.camas[data.camas.length - 1].ultimoEstado['createdBy'] = data.createdBy;

        data.save((errCreate) => {
            if (errCreate) {
                return next(errCreate);
            }

            req.body.newCama.ultimoEstado.idCama = data.camas[data.camas.length - 1]._id;
            CamaEstadoModel.crear(req.body.newCama.ultimoEstado, req).then(estado => {
                // data.ultimoEstado = estado;
            }).catch(errorCreate => {
                return next(errorCreate);
            });

            res.json(data.camas[data.camas.length - 1]);
        });

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
    organizacion
        .model
        .findByIdAndRemove(req.params._id, function (err, data) {
            if (err) {
                return next(err);
            }

            res.json(data);
        });
});

function validaCama(camas, nuevaCama) {
    let result = false;
    camas.forEach(cama => {
        // console.log(cama, '===', nuevaCama);
        if (cama.servicio.conceptId === cama.servicio.conceptId && cama.habitacion === nuevaCama.habitacion && cama.numero === nuevaCama.numero) {
            result = true;
        } else if (cama.habitacion === nuevaCama.habitacion && cama.numero === nuevaCama.numero) {
            result = true;
        }
    });
    return result;
}

export = router;
