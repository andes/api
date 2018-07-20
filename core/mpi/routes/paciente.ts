import * as express from 'express';
import * as mongoose from 'mongoose';
import { Matching } from '@andes/match';
import { pacienteMpi, paciente } from '../schemas/paciente';
import { log } from '../../log/schemas/log';
import * as controller from '../controller/paciente';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import { ElasticSync } from '../../../utils/elasticSync';
import * as debug from 'debug';
import { toArray } from '../../../utils/utils';

let logD = debug('paciente-controller');
let router = express.Router();

/* Consultas de estado de pacientes para el panel de información */
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

router.get('/pacientes/dashboard/', async function (req, res, next) {
    /**
     * Se requiere autorización para acceder al dashboard de MPI
     */
    if (!Auth.check(req, 'mpi:paciente:dashboard')) {
        return next(403);
    }
    let result = {
        paciente: [],
        pacienteMpi: [],
        logs: []
    };

    let estadoAggregate = [{
        $group: {
            '_id': {
                'estado': '$estado'
            },
            'count': {
                '$sum': 1
            }
        }
    }];

    let logAggregate = [
        {
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
    ];

    result.paciente = await toArray(paciente.aggregate(estadoAggregate).cursor({}).exec());
    result.pacienteMpi = await toArray(pacienteMpi.aggregate(estadoAggregate).cursor({ batchSize: 1000 }).exec());
    result.logs = await toArray(log.aggregate(logAggregate).cursor({ batchSize: 1000 }).exec());
    res.json(result);

});


router.get('/pacientes/auditoria/', function (req, res, next) {
    let filtro;
    switch (req.query.estado) {
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
    filtro['activo'] = req.query.activo === 'true' ? true : false;

    let query = paciente.find(filtro);
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });

});

router.get('/pacientes/auditoria/vinculados/', function (req, res, next) {
    let filtro = {'identificadores.entidad': 'ANDES'};
    // filtro['activo'] = req.query.activo === 'true' ? true : false;
    let query = paciente.find(filtro);
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });

});

router.get('/pacientes/auditoria/pacientesValidados/', function (req, res, next) {
    // if (!Auth.check(req, 'mpi:paciente:elasticSearch')) {
    //     return next(403);
    // }
    // Logger de la consulta a ejecutar
    // Logger.log(req, 'mpi', 'query', {
    //     elasticSearch: req.query
    // });

    controller.matchingAuditoria(req.query).then(result => {
        res.send(result);
    }).catch(error => {
        return next(error);
    });
});


// Simple mongodb query by ObjectId --> better performance
router.get('/pacientes/:id', function (req, res, next) {
    // busca en pacienteAndes y en pacienteMpi
    if (!Auth.check(req, 'mpi:paciente:getbyId')) {
        return next(403);
    }
    if (!(mongoose.Types.ObjectId.isValid(req.params.id))) {
        return next(404);
    }
    controller.buscarPaciente(req.params.id).then((resultado: any) => {
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

// Search using elastic search
router.get('/pacientes', function (req, res, next) {
    if (!Auth.check(req, 'mpi:paciente:elasticSearch')) {
        return next(403);
    }
    // Logger de la consulta a ejecutar
    Logger.log(req, 'mpi', 'query', {
        elasticSearch: req.query
    });

    controller.matching(req.query).then(result => {
        res.send(result);
    }).catch(error => {
        return next(error);
    });
});

router.put('/pacientes/mpi/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:paciente:putMpi')) {
        return next(403);
    }
    if (!(mongoose.Types.ObjectId.isValid(req.params.id))) {
        return next(404);

    }
    let ObjectId = mongoose.Types.ObjectId;
    let objectId = new ObjectId(req.params.id);
    let query = {
        _id: objectId
    };

    let match = new Matching();

    pacienteMpi.findById(query, function (err, patientFound: any) {
        if (err) {
            return next(404);
        }

        let connElastic = new ElasticSync();
        let pacienteOriginal = null;
        if (patientFound) {

            let data = req.body;

            controller.updatePacienteMpi(patientFound, data, req).then((p) => {
                res.json(p);
            }).catch(next);

        } else {
            let newPatient = new pacienteMpi(req.body);
            let claves = match.crearClavesBlocking(newPatient);
            newPatient['claveBlocking'] = claves;
            newPatient['apellido'] = newPatient['apellido'].toUpperCase();
            newPatient['nombre'] = newPatient['nombre'].toUpperCase();

            Auth.audit(newPatient, req);
            newPatient.save((err2) => {
                if (err2) {
                    return next(err2);
                }
                let nuevoPac = JSON.parse(JSON.stringify(newPatient));
                delete nuevoPac._id;

                connElastic.create(newPatient._id.toString(), nuevoPac).then(() => {
                    Logger.log(req, 'mpi', 'elasticInsertInPut', newPatient);
                    res.json(newPatient);
                }).catch(error => {
                    return next(error);
                });

            });
        }


    });
});

router.delete('/pacientes/mpi/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:paciente:deleteMpi')) {
        return next(403);
    }

    let ObjectId = mongoose.Types.ObjectId;
    let objectId = new ObjectId(req.params.id);

    controller.deletePacienteMpi(objectId).then((patientFound: any) => {
        let connElastic = new ElasticSync();
        connElastic.delete(patientFound._id.toString()).then(() => {
            res.json(patientFound);
        }).catch(error => {
            return next(error);
        });
        Auth.audit(patientFound, req);
    }).catch((error) => {
        return next(error);
    });
});

router.post('/pacientes', function (req, res, next) {
    if (!Auth.check(req, 'mpi:paciente:postAndes')) {
        return next(403);
    }
    if (req.body.documento) {
        let condicion = {
            'documento': req.body.documento
        };
        controller.searchSimilar(req.body, 'andes', condicion).then((data) => {
            logD('Encontrados', data.map(item => item.value));
            if (data && data.length && data[0].value > 0.90) {
                logD('hay uno parecido');
                return next('existen similares');
            } else {
                req.body.activo = true;
                return controller.createPaciente(req.body, req).then(pacienteObj => {
                    return res.json(pacienteObj);
                }).catch((error) => {
                    return next(error);
                });
            }
        });
    } else {
        req.body.activo = true;
        return controller.createPaciente(req.body, req).then(pacienteObjSinDocumento => {
            return res.json(pacienteObjSinDocumento);
        }).catch((error2 => {
            return next(error2);
        }));
    }
});

router.put('/pacientes/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:paciente:putAndes')) {
        return next(403);
    }
    if (!(mongoose.Types.ObjectId.isValid(req.params.id))) {
        return next(404);
    }
    let objectId = new mongoose.Types.ObjectId(req.params.id);
    let query = {
        _id: objectId
    };

    paciente.findById(query, function (err, patientFound: any) {
        if (err) {
            return next(404);
        }
        // let pacienteOriginal = null;
        if (patientFound) {
            let data = req.body;
            if (patientFound.estado === 'validado' && !patientFound.isScan) {
                delete data.documento;
                delete data.estado;
                delete data.sexo;
                delete data.fechaNacimiento;
            }
            controller.updatePaciente(patientFound, data, req).then((p) => {
                res.json(p);
            }).catch(next);

        } else {
            try {
                req.body._id = req.body.id;
                let newPatient = new paciente(req.body);
                // verifico si el paciente ya está en MPI
                pacienteMpi.findById(query, function (err3, patientFountMpi: any) {
                    if (err3) {
                        return next(404);
                    }
                    if (patientFountMpi) {
                        Auth.audit(newPatient, req);
                    }
                    newPatient.save((err2) => {
                        if (err2) {
                            return next(err2);
                        }
                        let nuevoPac = JSON.parse(JSON.stringify(newPatient));
                        // delete nuevoPac._id;
                        // delete nuevoPac.relaciones;
                        let connElastic = new ElasticSync();
                        connElastic.sync(newPatient).then(updated => {
                            if (updated) {
                                Logger.log(req, 'mpi', 'update', {
                                    original: nuevoPac,
                                    nuevo: newPatient
                                });
                            } else {
                                Logger.log(req, 'mpi', 'insert', newPatient);
                            }
                            res.json(nuevoPac);
                        }).catch(error => {
                            return next(error);
                        });
                    });
                });
            } catch (ex) {
                return next(ex);
            }
        }
    });
});

router.delete('/pacientes/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:paciente:deleteAndes')) {
        return next(403);
    }
    let ObjectId = mongoose.Types.ObjectId;
    let objectId = new ObjectId(req.params.id);
    controller.deletePacienteAndes(objectId).then((patientFound: any) => {
        let connElastic = new ElasticSync();
        connElastic.delete(patientFound._id.toString()).then(() => {
            res.json(patientFound);
        }).catch(error => {
            return next(error);
        });
        Auth.audit(patientFound, req);
    }).catch((error) => {
        return next(error);
    });
});

router.patch('/pacientes/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:paciente:patchAndes')) {
        return next(403);
    }
    controller.buscarPaciente(req.params.id).then(async (resultado: any) => {
        if (resultado) {
            switch (req.body.op) {
                case 'updateContactos':
                    controller.updateContactos(req, resultado.paciente);
                    resultado.paciente.markModified('contacto');
                    resultado.paciente.contacto = req.body.contacto;
                    break;
                case 'updateRelaciones':
                    controller.updateRelaciones(req, resultado.paciente);
                    break;
                case 'updateDireccion':
                    controller.updateDireccion(req, resultado.paciente);
                    break;
                case 'updateCarpetaEfectores':
                    try { // Actualizamos los turnos activos del paciente
                        let repetida = await controller.checkCarpeta(req, resultado.paciente);
                        if (!repetida) {
                            controller.updateTurnosPaciente(resultado.paciente);
                            controller.updateCarpetaEfectores(req, resultado.paciente);
                        } else {
                            return next('El numero de carpeta ya existe');
                        }
                    } catch (error) { return next(error); }
                    break;
                case 'updateContactos': // Update de carpeta y de contactos
                    resultado.paciente.markModified('contacto');
                    resultado.paciente.contacto = req.body.contacto;
                    try {
                        controller.updateTurnosPaciente(resultado.paciente);
                    } catch (error) {
                        return next(error);
                    }
                    break;
                case 'linkIdentificadores':
                    controller.linkIdentificadores(req, resultado.paciente);
                    break;
                case 'unlinkIdentificadores':
                    controller.unlinkIdentificadores(req, resultado.paciente);
                    break;
                case 'updateActivo':
                    controller.updateActivo(req, resultado.paciente);
                    break;
                case 'updateRelacion':
                    controller.updateRelacion(req, resultado.paciente);
                    break;
                case 'deleteRelacion':
                    controller.deleteRelacion(req, resultado.paciente);
                    break;
                case 'updateScan':
                    controller.updateScan(req, resultado.paciente);
                    break;
                case 'updateCuil':
                    controller.updateCuil(req, resultado.paciente);
                    break;
            }
            let pacienteAndes: any;
            if (resultado.db === 'mpi') {
                pacienteAndes = new paciente(resultado.paciente.toObject());
            } else {
                pacienteAndes = resultado.paciente;
            }
            let connElastic = new ElasticSync();
            connElastic.sync(pacienteAndes).then(() => {
                res.json(pacienteAndes);
            }).catch(error => {
                return next(error);
            });
            Auth.audit(pacienteAndes, req);
            pacienteAndes.save(function (errPatch) {
                if (errPatch) {
                    return next(errPatch);
                }
                return res.json(pacienteAndes);
            });
        }
    }).catch((err) => {
        return next(err);
    });
});

// Patch específico para actualizar masivamente MPI (NINGUN USUARIO DEBERIA TENER PERMISOS PARA ESTO)
router.patch('/pacientes/mpi/:id', function (req, res, next) {
    if (!Auth.check(req, 'mpi:paciente:patchMpi')) {
        return next(403);
    }
    controller.buscarPaciente(req.params.id).then((resultado) => {
        if (resultado) {
            switch (req.body.op) {
                case 'updateCuil':
                    controller.updateCuil(req, resultado.paciente);
                    break;

            }
            let pacMpi: any;
            if (resultado.db === 'mpi') {
                pacMpi = new pacienteMpi(resultado.paciente);
                Auth.audit(pacMpi, req);
                pacMpi.save(function (errPatch) {
                    if (errPatch) {
                        return next(errPatch);
                    }
                    return res.json(pacienteMpi);
                });
            } else {
                return res.json({});
            }
        } else {
            return next(500);
        }

    })
        .catch((err) => {
            return next(err);
        });
});



// Comentado hasta incorporar esta funcionalidad
//
// router.get('/pacientes/georef/:id', function (req, res, next) {
//     /* Este método es público no requiere auth check */
//     pacienteMpi.findById(req.params.id, function (err, data) {
//         if (err) {
//             console.log('ERROR GET GEOREF:  ', err);
//             return next(err);
//         }
//         console.log('DATA:  ', data);
//         let paciente;
//         paciente = data;
//         if (paciente && paciente.direccion[0].valor && paciente.direccion[0].ubicacion.localidad && paciente.direccion[0].ubicacion.provincia) {

//             let dir = paciente.direccion[0].valor;
//             let localidad = paciente.direccion[0].ubicacion.localidad.nombre;
//             let provincia = paciente.direccion[0].ubicacion.provincia.nombre;
//             // let pais = paciente.direccion[0].ubicacion.pais;
//             let pathGoogleApi = '';
//             let jsonGoogle = '';
//             pathGoogleApi = '/maps/api/geocode/json?address=' + dir + ',+' + localidad + ',+' + provincia + ',+' + 'AR' + '&key=' + configPrivate.geoKey;

//             pathGoogleApi = pathGoogleApi.replace(/ /g, '+');
//             pathGoogleApi = pathGoogleApi.replace(/á/gi, 'a');
//             pathGoogleApi = pathGoogleApi.replace(/é/gi, 'e');
//             pathGoogleApi = pathGoogleApi.replace(/í/gi, 'i');
//             pathGoogleApi = pathGoogleApi.replace(/ó/gi, 'o');
//             pathGoogleApi = pathGoogleApi.replace(/ú/gi, 'u');
//             pathGoogleApi = pathGoogleApi.replace(/ü/gi, 'u');
//             pathGoogleApi = pathGoogleApi.replace(/ñ/gi, 'n');

//             console.log('PATH CONSULTA GOOGLE API:   ', pathGoogleApi);

//             let optionsgetmsg = {
//                 host: 'maps.googleapis.com',
//                 port: 443,
//                 path: pathGoogleApi,
//                 method: 'GET',
//                 rejectUnauthorized: false
//             };


//             let reqGet = https.request(optionsgetmsg, function (res2) {
//                 res2.on('data', function (d, error) {
//                     jsonGoogle = jsonGoogle + d.toString();
//                     console.log('RESPONSE: ', jsonGoogle);
//                 });

//                 res2.on('end', function () {
//                     let salida = JSON.parse(jsonGoogle);
//                     if (salida.status === 'OK') {
//                         res.json(salida.results[0].geometry.location);
//                     } else {
//                         res.json('');
//                     }
//                 });
//             });
//             req.on('error', (e) => {
//                 console.error(e);
//                 return next(e);
//             });
//             reqGet.end();
//         } else {
//             return next('Datos incorrectos');
//         }
//     });
// });

export = router;
