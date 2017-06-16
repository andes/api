import { matching } from '@andes/match';
import * as express from 'express';
import * as mongoose from 'mongoose';
import { paciente } from '../schemas/paciente';
import { pacienteMpi } from '../schemas/paciente';
import { Client } from 'elasticsearch';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as moment from 'moment';
import { log } from '../../log/schemas/log';
import * as https from 'https';
let router = express.Router();

router.get('/pacientes/georef/:id', function (req, res, next) {
    /* Este método es público no requiere auth check */

    pacienteMpi.findById(req.params.id, function (err, data) {
        if (err) {
            console.log('ERROR GET GEOREF:  ', err);
            return next(err);
        }
        console.log('DATA:  ', data);
        let paciente;
        paciente = data;
        if (paciente && paciente.direccion[0].valor && paciente.direccion[0].ubicacion.localidad && paciente.direccion[0].ubicacion.provincia) {

            let dir = paciente.direccion[0].valor;
            let localidad = paciente.direccion[0].ubicacion.localidad.nombre;
            let provincia = paciente.direccion[0].ubicacion.provincia.nombre;
            // let pais = paciente.direccion[0].ubicacion.pais;
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
            return next('Datos incorrectos');
        }
    });
});

/**
 * @swagger
 * definition:
 *   paciente:
 *     properties:
 *       documento:
 *          type: string
 *       activo:
 *          type: boolean
 *       estado:
 *          type: string
 *          enum:
 *              - temporal
 *              - identificado
 *              - validado
 *              - recienNacido
 *              - extranjero
 *       nombre:
 *          type: string
 *       apellido:
 *          type: string
 *       alias:
 *          type: string
 *       contacto:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  tipo:
 *                      type: string
 *                      enum:
 *                          - Teléfono Fijo
 *                          - Teléfono Celular
 *                          - Email
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
 *       sexo:
 *          type: string
 *          enum:
 *              - femenino
 *              - masculino
 *              - otro
 *       genero:
 *          type: string
 *          enum:
 *              - femenino
 *              - masculino
 *              - otro
 *       fechaNacimiento:
 *          type: string
 *          format: date
 *       fechaFallecimiento:
 *          type: string
 *          format: date
 *       estadoCivil:
 *          type: string
 *          enum:
 *              - casado
 *              - separado
 *              - divorciado
 *              - viudo
 *              - soltero
 *              - otro
 *       foto:
 *          type: string
 *       relaciones:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  relacion:
 *                      type: string
 *                      enum:
 *                          - padre
 *                          - madre
 *                          - hijo
 *                          - tutor
 *                  nombre:
 *                      type: string
 *                  apellido:
 *                      type: string
 *                  documento:
 *                      type: string
 *       financiador:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  id:
 *                      type: string
 *                  nombre:
 *                      type: string
 *                  activo:
 *                      type: boolean
 *                  fechaAlta:
 *                      type: string
 *                      format: date
 *                  fechaBaja:
 *                      type: string
 *                      format: date
 *                  ranking:
 *                      type: number
 *       claveBloking:
 *          type: array
 *          items:
 *              type: string
 *       entidadesValidadoras:
 *          type: array
 *          items:
 *              type: string
 */



/*Consultas de estado de pacientes para el panel de información*/
router.get('/pacientes/counts/', function (req, res, next) {
    /* Este get es público ya que muestra sólamente la cantidad de pacientes en MPI */
    let filtro;
    switch (req.query.consulta) {
        case 'validados':
            filtro = {
                estado: 'validado'
            };
            break;
        case 'temporales':
            filtro = {
                estado: 'temporal'
            };
            break;
        case 'fallecidos':
            filtro = {
                fechaFallecimiento: {
                    $exists: true
                }
            };
            break;
    }
    let query = paciente.find(filtro).count();
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }

        let queryMPI = pacienteMpi.find(filtro).count();
        queryMPI.exec(function (err1, data1) {
            if (err1) {
                return next(err1);
            }
            let total = data + data1;
            res.json(total);
        });

    });
});

router.get('/pacientes/dashboard/', function (req, res, next) {
    /**
     * Se requiere autorización para acceder al dashboard de MPI
     */
    if (!Auth.check(req, 'mpi:dashboard:*')) {
        return next(403);
    }
    let result = {
        paciente: null,
        pacienteMpi: null,
        logs: null
    };

    paciente.aggregate([{
        $group: {
            '_id': {
                'estado': '$estado'
            },
            'count': {
                '$sum': 1
            }
        }
    }],
        function (err, data) {
            if (err) {
                return next(err);
            }
            result.paciente = data;
            pacienteMpi.aggregate([{
                $group: {
                    '_id': {
                        'estado': '$estado'
                    },
                    'count': {
                        '$sum': 1
                    }
                }
            }],
                function (err1, data1) {
                    if (err1) {
                        return next(err1);
                    }

                    result.pacienteMpi = data1;
                    log.aggregate([{
                        $group: {
                            '_id': {
                                'operacion': '$operacion',
                                'modulo': '$modulo'
                            },
                            'count': {
                                '$sum': 1
                            }
                        }
                    },
                    {
                        $match: {
                            '_id.modulo': 'mpi'
                        }
                    }
                    ],
                        function (err2, data2) {
                            if (err2) {
                                return next(err2);
                            }
                            result.logs = data2;
                            res.json(result);
                        });
                }
            );
        }
    );

});



/**
 * @swagger
 * /pacientes:
 *   get:
 *     tags:
 *       - Paciente
 *     description: Retorna un arreglo de objetos Paciente
 *     summary: Buscar pacientes
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre del paciente
 *         required: false
 *         type: string
 *       - name: apellido
 *         in: query
 *         description: El apellido del paciente
 *         required: false
 *         type: string
 *       - name: documento
 *         in: query
 *         description: El documento del paciente
 *         required: false
 *         type: string
 *       - name: fechaNacimiento
 *         in: query
 *         description: El documento del paciente
 *         required: false
 *         type: string
 *         format: date
 *       - name: estado
 *         in: query
 *         description: El estado del paciente
 *         required: false
 *         type: string
 *         enum:
 *              - temporal
 *              - identificado
 *              - validado
 *              - recienNacido
 *              - extranjero
 *       - name: sexo
 *         in: query
 *         description:
 *         required: false
 *         type: string
 *         enum:
 *              - femenino
 *              - masculino
 *              - otro
 *     responses:
 *       200:
 *         description: un arreglo de objetos paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 *       400:
 *         description: Error- Agregar parámetro de búsqueda
 *
 * /pacientes/{id}:
 *   get:
 *     tags:
 *       - Paciente
 *     description: Retorna un objeto Paciente
 *     summary: Buscar paciente por ID
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id del paciente
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: un arreglo con un paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */

// Simple mongodb query by ObjectId --> better performance
router.get('/pacientes/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:get:byId')) {
        return next(403);
    }
    buscarPaciente(req.params.id).then((resultado: any) => {
        if (resultado) {
            Logger.log(req, 'mpi', 'query', {
                mongoDB: resultado.paciente
            });
            res.json(resultado.paciente);
        } else {
            return next(500);
        }
    }).catch((err) => {
        return next(err);
    });

});

/**
 * @swagger
 * /pacientes:
 *   get:
 *     tags:
 *       - Paciente
 *     description: Retorna un arreglo de objetos Paciente
 *     summary: Buscar pacientes usando ElasticSearch
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: type
 *         description: tipo de búsqueda
 *         in: body
 *         required: true
 *         type: string
 *         enum:
 *              - simplequery
 *              - multimatch
 *              - suggest
 *       - name: cadenaInput
 *         description: pámetro requerido para multimatch
 *         in: body
 *         type: string
 *       - name: claveBlocking
 *         description: pámetro requerido para suggest
 *         in: body
 *         type: string
 *       - name: percentage
 *         description: pámetro requerido para suggest
 *         in: body
 *         type: boolean
 *       - name: documento
 *         description: pámetro requerido para suggest y simplequery
 *         in: body
 *         type: string
 *       - name: nombre
 *         description: pámetro requerido para suggest y simplequery
 *         in: body
 *         type: string
 *       - name: apellido
 *         description: pámetro requerido para suggest y simplequery
 *         in: body
 *         type: string
 *       - name: sexo
 *         description: pámetro requerido para suggest y simplequery
 *         in: body
 *         type: string
 *       - name: fechaNacimiento
 *         description: pámetro requerido para suggest
 *         in: body
 *         type: Date
 *       - name: escaneado
 *         description: pámetro requerido para suggest
 *         in: body
 *         type: boolean
 *     responses:
 *       200:
 *         description: un arreglo de objetos paciente
 *       400:
 *         description: Error- Agregar parámetro de búsqueda
 *
 */
// Search using elastic search
router.get('/pacientes', function (req, res, next) {
    if (!Auth.check(req, 'mpi:get:simplequery,multimatch,suggest')) {
        return next(403);
    }
    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });

    let query;
    switch (req.query.type) {
        case 'simplequery':
            {
                query = {
                    simple_query_string: {
                        query: '\"' + req.query.documento + '\" + \"' + req.query.apellido + '\" + \"' + req.query.nombre + '\" +' + req.query.sexo,
                        fields: ['documento', 'apellido', 'nombre', 'sexo'],
                        default_operator: 'and'
                    }
                };
            }
            break;
        case 'multimatch':
            {
                query = {
                    multi_match: {
                        query: req.query.cadenaInput,
                        type: 'cross_fields',
                        fields: ['documento^5', 'nombre', 'apellido^3'],
                    }
                };
            }
            break;
        case 'suggest':
            {
                // let condicion = {};

                // Sugiere pacientes que tengan la misma clave de blocking
                let campo = req.query.claveBlocking;
                let condicionMatch = {};
                condicionMatch[campo] = {
                    query: req.query.documento,
                    minimum_should_match: 3,
                    fuzziness: 2
                };
                query = {
                    match: condicionMatch
                };
            }
            break;
    };
    // Configuramos la cantidad de resultados que quiero que se devuelva y la query correspondiente
    let body = {
        size: 100,
        from: 0,
        query: query
    };

    // Logger de la consulta a ejecutar
    Logger.log(req, 'mpi', 'query', {
        elasticSearch: query
    });

    if (req.query.type === 'suggest') {

        connElastic.search({
            index: 'andes',
            body: body
        })
            .then((searchResult) => {

                // Asigno los valores para el suggest
                let weights = config.mpi.weightsDefault;

                if (req.query.escaneado) {
                    weights = config.mpi.weightsScan;
                }

                let porcentajeMatchMax = config.mpi.cotaMatchMax;
                let porcentajeMatchMin = config.mpi.cotaMatchMin;
                let listaPacientesMax = [];
                let listaPacientesMin = [];
                // let devolverPorcentaje = req.query.percentage;

                let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                    .filter(function (hit) {
                        let paciente = hit._source;
                        let pacDto = {
                            documento: req.query.documento ? req.query.documento.toString() : '',
                            nombre: req.query.nombre ? req.query.nombre : '',
                            apellido: req.query.apellido ? req.query.apellido : '',
                            fechaNacimiento: req.query.fechaNacimiento ? moment(new Date(req.query.fechaNacimiento)).format('YYYY-MM-DD') : '',
                            sexo: req.query.sexo ? req.query.sexo : ''
                        };
                        let pacElastic = {
                            documento: paciente.documento ? paciente.documento.toString() : '',
                            nombre: paciente.nombre ? paciente.nombre : '',
                            apellido: paciente.apellido ? paciente.apellido : '',
                            fechaNacimiento: paciente.fechaNacimiento ? moment(paciente.fechaNacimiento).format('YYYY-MM-DD') : '',
                            sexo: paciente.sexo ? paciente.sexo : ''
                        };
                        let match = new matching();
                        let valorMatching = match.matchPersonas(pacElastic, pacDto, weights);
                        paciente['id'] = hit._id;

                        if (valorMatching >= porcentajeMatchMax) {
                            listaPacientesMax.push({
                                id: hit._id,
                                paciente: paciente,
                                match: valorMatching
                            });
                        } else {
                            if (valorMatching >= porcentajeMatchMin && valorMatching < porcentajeMatchMax) {
                                listaPacientesMin.push({
                                    id: hit._id,
                                    paciente: paciente,
                                    match: valorMatching
                                });
                            }
                        }
                        // console.log("SEARCHRESULT-------------",paciente.documento,paciente.apellido,valorMatching);
                    });

                // if (devolverPorcentaje) {
                let sortMatching = function (a, b) {
                    return b.match - a.match;
                };

                // cambiamos la condición para lograr que nos devuelva más de una sugerencia
                // ya que la 1ra sugerencia es el mismo paciente.
                // if (listaPacientesMax.length > 0) {
                if (listaPacientesMax.length > 0) {
                    listaPacientesMax.sort(sortMatching);
                    res.send(listaPacientesMax);
                } else {
                    listaPacientesMin.sort(sortMatching);
                    res.send(listaPacientesMin);
                }
                // } else {
                //     results = results.map((hit) => {
                //         let elem = hit._source;
                //         elem['id'] = hit._id;
                //         return elem;
                //     });
                //     res.send(results);
                // }
            })
            .catch((error) => {
                next(error);
            });
    } else { // Es para los casos de multimatch y singlequery
        connElastic.search({
            index: 'andes',
            body: body
        })
            .then((searchResult) => {
                let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                    .map((hit) => {
                        let elem = hit._source;
                        elem['id'] = hit._id;
                        return elem;
                    });
                res.send(results);
            })
            .catch((error) => {
                next(error);
            });
    }
});

/**
 * @swagger
 * /pacientes/mpi:
 *   post:
 *     tags:
 *       - Paciente
 *     summary: Carga de pacientes al core de MPI
 *     description: Carga de pacientes al core de MPI
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: organizacion
 *         description: objeto paciente
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/paciente'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 *       409:
 *         description: Un código de error con un array de mensajes de error
 */
router.post('/pacientes/mpi', function (req, res, next) {
    if (!Auth.check(req, 'mpi:post:mpi')) {
        return next(403);
    }

    let match = new matching();
    let newPatientMpi = new pacienteMpi(req.body);
    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });
    // Se genera la clave de blocking
    let claves = match.crearClavesBlocking(newPatientMpi);
    newPatientMpi['claveBlocking'] = claves;

    Auth.audit(newPatientMpi, req);

    newPatientMpi.save((err) => {
        if (err) {
            console.log('Error al insertar un paciente en MPI: ', err);
            return next(err);
        }
        let nuevoPac = JSON.parse(JSON.stringify(newPatientMpi));
        delete nuevoPac._id;
        connElastic.create({
            index: 'andes',
            type: 'paciente',
            id: newPatientMpi._id.toString(),
            body: nuevoPac
        }, function (error, response) {
            if (error) {
                // Logger.log(req, 'pacientes', 'elasticError', error);
                next(error);
            }
            Logger.log(req, 'mpi', 'elasticInsert', {
                nuevo: nuevoPac,
            });
            res.json(newPatientMpi);
        });
    });
});

router.put('/pacientes/mpi/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:put:mpi:byId')) {
        return next(403);
    }
    let ObjectId = mongoose.Types.ObjectId;
    let objectId = new ObjectId(req.params.id);
    let query = {
        _id: objectId
    };
    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });
    let match = new matching();

    pacienteMpi.findById(query, function (err, patientFound: any) {
        if (err) {
            console.log('Error del findByID: ', err);
            return next(404);
        }

        let pacienteOriginal = null;
        if (patientFound) {
            // Guarda los valores originales para el logger
            pacienteOriginal = patientFound.toObject();

            /*Update de paciente de todos los campos salvo que esté validado*/
            // if (patientFound.estado !== 'validado') {
            patientFound.documento = req.body.documento;
            patientFound.estado = req.body.estado;
            patientFound.nombre = req.body.nombre.toUpperCase();
            patientFound.apellido = req.body.apellido.toUpperCase();
            patientFound.sexo = req.body.sexo;
            patientFound.fechaNacimiento = req.body.fechaNacimiento;
            /*Si es distinto de validado debo generar una nueva clave de blocking */
            let claves = match.crearClavesBlocking(patientFound);
            patientFound.claveBlocking = claves;
            // } else {
            //     patientFound.nombre = req.body.nombre.toUpperCase();
            //     patientFound.apellido = req.body.apellido.toUpperCase();
            // }
            patientFound.genero = req.body.genero;
            patientFound.alias = req.body.alias;
            patientFound.estadoCivil = req.body.estadoCivil;
            patientFound.entidadesValidadoras = req.body.entidadesValidadoras;
            patientFound.financiador = req.body.financiador;
            patientFound.relaciones = req.body.relaciones;
            patientFound.direccion = req.body.direccion;
            patientFound.contacto = req.body.contacto;
            patientFound.identificadores = req.body.identificadores;
            patientFound.scan = req.body.scan;
            patientFound.reportarError = req.body.reportarError;
            Auth.audit(patientFound, req);
            patientFound.save(function (err2) {
                if (err2) {
                    // console.log('Error Save:               ', err2);
                    return next(err2);
                }

                let pacAct = JSON.parse(JSON.stringify(patientFound));
                delete pacAct._id;

                connElastic.search({
                    q: patientFound._id.toString()
                }).then(function (body) {
                    let hits = body.hits.hits;
                    if (hits.length > 0) {
                        connElastic.update({
                            index: 'andes',
                            type: 'paciente',
                            id: patientFound._id.toString(),
                            body: {
                                doc: pacAct
                            }
                        }, function (error, response) {
                            if (error) {
                                console.log('Error al actualizar elastic en PUT:       ', error);
                                // Logger.log(req, 'pacientes', 'elasticError', error);
                            }
                            Logger.log(req, 'mpi', 'elasticUpdate', {
                                original: pacienteOriginal,
                                nuevo: patientFound
                            });
                            res.json(patientFound);
                        });
                    } else {
                        connElastic.create({
                            index: 'andes',
                            type: 'paciente',
                            id: patientFound._id.toString(),
                            body: pacAct
                        }, function (error, response) {
                            if (error) {
                                console.log('Error al actualizar elastic en PUT NEW:            ', error);
                                // Logger.log(req, 'pacientes', 'elasticError', error);
                            }
                            Logger.log(req, 'mpi', 'elasticInsert', patientFound);
                            res.json(patientFound);
                        });
                    }
                }, function (error) {
                    return next(error);
                    // console.trace(error.message);
                });
            });
        } else {
            let newPatient = new pacienteMpi(req.body);
            let claves = match.crearClavesBlocking(newPatient);
            newPatient['claveBlocking'] = claves;
            newPatient['apellido'] = newPatient['apellido'].toUpperCase();
            newPatient['nombre'] = newPatient['nombre'].toUpperCase();

            Auth.audit(newPatient, req);
            newPatient.save((err2) => {
                if (err2) {
                    console.log('Error al persistir los datos: ', err2);
                    return next(err2);
                }
                let nuevoPac = JSON.parse(JSON.stringify(newPatient));
                delete nuevoPac._id;


                connElastic.create({
                    index: 'andes',
                    type: 'paciente',
                    id: newPatient._id.toString(),
                    body: nuevoPac
                }, function (error, response) {
                    if (error) {
                        console.log('Error en elastic al hacer un insert desde el PUT:          ', error);
                        // Logger.log(req, 'pacientes', 'elasticError', error);
                    }
                    Logger.log(req, 'mpi', 'elasticInsertInPut', newPatient);
                    res.json(newPatient);
                });
            });
        }


    });
});

/**
 * @swagger
 * /pacientes/mpi/{id}:
 *   delete:
 *     tags:
 *       - Paciente
 *     description: Eliminar un paciente del core de MPI
 *     summary: Eliminar un paciente del core de MPI
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de un paciente
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */
router.delete('/pacientes/mpi/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:delete:mpi:byId')) {
        return next(403);
    }

    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });

    let ObjectId = (require('mongoose').Types.ObjectId);
    let objectId = new ObjectId(req.params.id);
    let query = {
        _id: objectId
    };
    pacienteMpi.findById(query, function (err, patientFound) {
        if (err) {
            return next(err);
        }
        patientFound.remove();
        connElastic.delete({
            index: 'andes',
            type: 'paciente',
            id: patientFound._id.toString(),
        }, function (error, response) {
            if (error) {
                console.log('Error en el borrado del indice de elastic en mpi:  ', error);
                // Logger.log(req, 'pacientes', 'elasticError', error);
            }
            // Logger.log(req, 'pacientes', 'elasticDelete', patientFound);
            res.json(patientFound);
        });
    });
});

/**
 * @swagger
 * /pacientes:
 *   post:
 *     tags:
 *       - Paciente
 *     description: Cargar un paciente
 *     summary: Cargar un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: organizacion
 *         description: objeto paciente
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/paciente'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 *       409:
 *         description: Un código de error con un array de mensajes de error
 */
router.post('/pacientes', function (req, res, next) {
    if (!Auth.check(req, 'mpi:post:andes')) {
        return next(403);
    }
    let match = new matching();
    let newPatient = new paciente(req.body);
    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });

    // Se genera la clave de blocking
    let claves = match.crearClavesBlocking(newPatient);
    newPatient['claveBlocking'] = claves;
    newPatient['apellido'] = newPatient['apellido'].toUpperCase();
    newPatient['nombre'] = newPatient['nombre'].toUpperCase();

    Auth.audit(newPatient, req);
    newPatient.save((err) => {
        if (err) {
            console.log('Error al persistir los datos: ', err);
            return next(err);
        }
        //  console.log("NEW PATIENT:   ", newPatient['fechaNacimiento']);
        let nuevoPac = JSON.parse(JSON.stringify(newPatient));
        delete nuevoPac._id;
        delete nuevoPac.relaciones;
        connElastic.create({
            index: 'andes',
            type: 'paciente',
            id: newPatient._id.toString(),
            body: nuevoPac
        }, function (error, response) {
            if (error) {
                console.log(error);
            }
            Logger.log(req, 'mpi', 'insert', newPatient);
            res.json(newPatient);
        });
    });
});


/**
 * @swagger
 * /pacientes:
 *   put:
 *     tags:
 *       - Paciente
 *     description: Actualizar un paciente
 *     summary: Actualizar un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id del paciente
 *         required: true
 *         type: string
 *       - name: paciente
 *         description: objeto paciente
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/paciente'
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */


router.put('/pacientes/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:put:andes:byId')) {
        return next(403);
    }
    let ObjectId = mongoose.Types.ObjectId;
    let objectId = new ObjectId(req.params.id);
    let query = {
        _id: objectId
    };
    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });
    let match = new matching();

    paciente.findById(query, function (err, patientFound: any) {
        if (err) {
            console.log('Error del findByID: ', err);
            return next(404);
        }
        //  console.log("REQ BODY ---------------------- ",req.body);
        let pacienteOriginal = null;
        if (patientFound) {

            // Guarda los valores originales para el logger
            pacienteOriginal = patientFound.toObject();

            /*Update de paciente de todos los campos salvo que esté validado o halla sido escaneado*/
            if (patientFound.estado !== 'validado' || patientFound.isScan) {
                patientFound.documento = req.body.documento;
                patientFound.estado = req.body.estado;
                patientFound.nombre = req.body.nombre;
                patientFound.apellido = req.body.apellido;
                patientFound.sexo = req.body.sexo;

                patientFound.fechaNacimiento = req.body.fechaNacimiento;
                /*Si es distinto de validado debo generar una nueva clave de blocking */
                let claves = match.crearClavesBlocking(patientFound);
                patientFound.claveBlocking = claves;
            } else {
                patientFound.nombre = req.body.nombre.toUpperCase();
                patientFound.apellido = req.body.apellido.toUpperCase();
            }

            patientFound.genero = req.body.genero;
            patientFound.alias = req.body.alias;
            patientFound.estadoCivil = req.body.estadoCivil;
            patientFound.entidadesValidadoras = req.body.entidadesValidadoras;
            patientFound.financiador = req.body.financiador;
            patientFound.relaciones = req.body.relaciones;
            patientFound.direccion = req.body.direccion;
            patientFound.contacto = req.body.contacto;
            patientFound.identificadores = req.body.identificadores;
            patientFound.scan = req.body.scan;
            patientFound.reportarError = req.body.reportarError;
            patientFound.notas = req.body.notas;

            //   console.log("PATIENT FOUND ------------------",patientFound)
            // Habilita auditoria y guarda
            Auth.audit(patientFound, req);
            patientFound.save(function (err2) {
                if (err2) {
                    console.log('Error Save', err2);
                    return next(err2);
                }

                let pacAct = JSON.parse(JSON.stringify(patientFound));
                delete pacAct._id;
                delete pacAct.relaciones;
                connElastic.search({
                    q: '_id:' + patientFound.id.toString()
                }).then(function (body) {

                    let hits = body.hits.hits;
                    if (hits.length > 0) {
                        connElastic.update({
                            index: 'andes',
                            type: 'paciente',
                            id: patientFound._id.toString(),
                            body: {
                                doc: pacAct
                            }
                        }, function (error, response) {
                            if (error) {
                                console.log('Error de actualiazción Elastic', error);
                            }
                            Logger.log(req, 'mpi', 'update', {
                                original: pacienteOriginal,
                                nuevo: patientFound
                            });
                            res.json(patientFound);
                        });
                    } else {
                        connElastic.create({
                            index: 'andes',
                            type: 'paciente',
                            id: patientFound._id.toString(),
                            body: {
                                doc: pacAct
                            }
                        }, function (error, response) {
                            if (error) {
                                console.log('Error creación en Elastic', error);
                            }
                            Logger.log(req, 'mpi', 'update', {
                                original: pacienteOriginal,
                                nuevo: patientFound
                            });
                            res.json(patientFound);
                        });
                    }
                });
            });
        } else {
            req.body._id = req.body.id;
            let newPatient = new paciente(req.body);

            // console.log("NEW PATIENT---------------",newPatient);
            let claves = match.crearClavesBlocking(newPatient);
            newPatient['claveBlocking'] = claves;
            newPatient['apellido'] = newPatient['apellido'].toUpperCase();
            newPatient['nombre'] = newPatient['nombre'].toUpperCase();
            /*Antes del save se podría realizar una búsqueda y matching para evitar cargar repetidos, actualmente este proceso sólo se realiza del lado de la app*/
            Auth.audit(newPatient, req);
            newPatient.save((err2) => {
                if (err2) {
                    return next(err2);
                }

                let nuevoPac = JSON.parse(JSON.stringify(newPatient));
                delete nuevoPac._id;
                delete nuevoPac.relaciones;

                connElastic.search({
                    q: '_id:' + newPatient._id.toString()
                }).then(function (body) {
                    let hits = body.hits.hits;
                    if (hits.length > 0) {
                        console.log('hay q actualizar el docmento en elastic');
                        connElastic.update({
                            index: 'andes',
                            type: 'paciente',
                            id: newPatient._id.toString(),
                            body: {
                                doc: nuevoPac
                            }
                        }, function (error, response) {
                            if (error) {
                                console.log('Error update Elastic', error);
                            }
                            Logger.log(req, 'mpi', 'update', {
                                original: pacienteOriginal,
                                nuevo: newPatient
                            });
                            res.json(newPatient);
                        });
                    } else {
                        connElastic.create({
                            index: 'andes',
                            type: 'paciente',
                            id: newPatient._id.toString(),
                            body: nuevoPac
                        }, function (error, response) {
                            console.log('Error create Elastic', response);
                            if (error) {
                                console.log(error);
                                Logger.log(req, 'mpi', 'insert', {
                                    error: error,
                                    data: newPatient
                                });
                            }
                            Logger.log(req, 'mpi', 'insert', newPatient);
                            res.json(newPatient);
                        });
                    }
                }, function (error) {
                    console.log(error.message);
                });
            });
        }


    });
});

/**
 * @swagger
 * /pacientes/{id}:
 *   delete:
 *     tags:
 *       - Paciente
 *     description: Eliminar un paciente
 *     summary: Eliminar un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de un paciente
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */
router.delete('/pacientes/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:delete:andes:byId')) {
        return next(403);
    }

    let ObjectId = mongoose.Types.ObjectId;
    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });
    let objectId = new ObjectId(req.params.id);
    let query = {
        _id: objectId
    };
    paciente.findById(query, function (err, patientFound) {
        if (err) {
            console.log('No encontro el paciente a borrar:   ', err);
            return next(err);
        }
        // (req as any).user = 'prueba';
        // (req as any).organizacion = 'prueba';
        console.log('antes del audit');
        console.log('el paciente encontrado es:   ', patientFound);
        Auth.audit(patientFound, req);
        console.log('despues del audit');
        patientFound.remove();
        connElastic.delete({
            index: 'andes',
            type: 'paciente',
            refresh: true,
            id: patientFound._id.toString(),
        }, function (error, response) {
            if (error) {
                console.log('Error en elastic Search delete: ', error);
            }
            console.log('borro ok va a loguear');
            // Logger.log(req, 'pacientes', 'delete', patientFound);
            res.json(patientFound);
        });


    });
});


function buscarPaciente(id) {
    return new Promise((resolve, reject) => {
        paciente.findById(id, function (err, data) {
            if (err) {
                reject(err);
            } else {
                if (data) {
                    let resultado = {
                        db: 'andes',
                        paciente: data
                    };
                    resolve(resultado);
                } else {
                    pacienteMpi.findById(id, function (err2, dataMpi) {
                        if (err2) {
                            reject(err2);
                        }
                        let resultado = {
                            db: 'mpi',
                            paciente: dataMpi
                        };
                        resolve(resultado);
                    });
                }
            }
        });
    });
}

/**
 * @swagger
 * /pacientes/{id}:
 *   patch:
 *     tags:
 *       - Paciente
 *     description: Modificar ciertos datos de un paciente
 *     summary: Modificar ciertos datos de un paciente
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de un paciente
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto paciente
 *         schema:
 *           $ref: '#/definitions/paciente'
 */

/* Funciones  de operaciones PATCH */
function updateContactos(req, data) {
    data.markModified('contacto');
    data.contacto = req.body.contacto;
}

function updateRelaciones(req, data) {
    data.markModified('relaciones');
    data.relaciones = req.body.relaciones;
}

function updateDireccion(req, data) {
    data.markModified('direccion');
    data.direccion = req.body.direccion;
}

function updateCarpetaEfectores(req, data) {
    data.markModified('carpetaEfectores');
    data.carpetaEfectores = req.body.carpetaEfectores;
}

function updateRelacion(req, data) {
    if (data && data.relaciones) {
        let objRel = data.relaciones.find(elem => {
            if (elem && req.body.dto && elem.referencia && req.body.dto.referencia) {
                if (elem.referencia.toString() === req.body.dto.referencia.toString()) {
                    return elem;
                }
            }
        });

        if (!objRel) {
            data.markModified('relaciones');
            data.relaciones.push(req.body.dto);
        }
    }
}
function deleteRelacion(req, data) {
    if (data && data.relaciones) {
        data.relaciones.find(function (value, index, array) {
            if (value && value.referencia && req.body.dto && req.body.dto.referencia) {
                if (value.referencia.toString() === req.body.dto.referencia.toString()) {
                    array.splice(index, 1);
                }
            }
        });
    }
}

router.patch('/pacientes/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:patch:andes:byId')) {
        return next(403);
    }
    buscarPaciente(req.params.id).then((resultado: any) => {
        if (resultado) {
            switch (req.body.op) {
                case 'updateContactos':
                    updateContactos(req, resultado.paciente);
                    break;
                case 'updateRelaciones':
                    updateRelaciones(req, resultado.paciente);
                    break;
                case 'updateDireccion':
                    updateDireccion(req, resultado.paciente);
                    break;
                case 'updateCarpetaEfectores':
                    updateCarpetaEfectores(req, resultado.paciente);
                    break;

                case 'updateRelacion':
                    // console.log("RESULTADO BUSQUEDApACIENTE--------", resultado);
                    updateRelacion(req, resultado.paciente);
                    break;
                case 'deleteRelacion':
                    // console.log("RESULTADO BUSQUEDApACIENTE--------", resultado);
                    deleteRelacion(req, resultado.paciente);
                    break;
            }
            Auth.audit(resultado.paciente, req);
            resultado.paciente.save(function (errPatch) {
                if (errPatch) {
                    console.log('ERROR:', errPatch);
                    return next(errPatch);
                }
                return res.json(resultado.paciente);
            });
        }
    }).catch((err) => {
        return next(err);
    });
});

export = router;
