import * as config from '../../../config';
import * as moment from 'moment';
import { paciente, pacienteMpi } from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import { Logger } from '../../../utils/logService';
import { Matching } from '@andes/match';
import { Auth } from './../../../auth/auth.class';
import * as agendaController from '../../../modules/turnos/controller/agenda';
import * as turnosController from '../../../modules/turnos/controller/turnosController';

/**
 * Crea un paciente y lo sincroniza con elastic
 *
 * @param data Datos del paciente
 * @param req  request de express para poder auditar
 */
export function createPaciente(data, req) {
    return new Promise((resolve, reject) => {
        const newPatient = new paciente(data);
        if (req) {
            Auth.audit(newPatient, req);
        }
        newPatient.save((err) => {
            if (err) {
                return reject(err);
            }
            const nuevoPac = JSON.parse(JSON.stringify(newPatient));
            delete nuevoPac._id;
            delete nuevoPac.relaciones;
            const connElastic = new ElasticSync();
            connElastic.create(newPatient._id.toString(), nuevoPac).then(() => {
                Logger.log(req, 'mpi', 'insert', newPatient);
                return resolve(newPatient);
            }).catch(error => {
                return reject(error);
            });
        });
    });
}


export function updatePaciente(pacienteObj, data, req) {
    return new Promise((resolve, reject) => {
        const pacienteOriginal = pacienteObj.toObject();
        for (const key in data) {
            pacienteObj[key] = data[key];
        }
        // Habilita auditoria y guarda
        if (req) {
            // pacienteObj.markModified;
            Auth.audit(pacienteObj, req);
        }
        pacienteObj.save((err2) => {
            if (err2) {
                return reject(err2);
            }
            try {
                updateTurnosPaciente(pacienteObj);
            } catch (error) { return error; }
            const connElastic = new ElasticSync();
            connElastic.sync(pacienteObj).then(updated => {
                if (updated) {
                    Logger.log(req, 'mpi', 'update', {
                        original: pacienteOriginal,
                        nuevo: pacienteObj
                    });
                } else {
                    Logger.log(req, 'mpi', 'insert', pacienteObj);
                }
                resolve(pacienteObj);
            }).catch(error => {
                return reject(error);
            });
            resolve(pacienteObj);
        });
    });
}
/**
 * Busca los turnos futuros asignados al paciente y actualiza los datos.
 *
 * @param {any} pacienteModified paciente modificado
 * @returns
 */
export async function updateTurnosPaciente(pacienteModified) {
    const req = {
        query: {
            estado: 'asignado',
            pacienteId: pacienteModified.id,
            horaInicio: moment(new Date()).startOf('day').toDate() as any
        }
    };
    const turnos: any = await turnosController.getHistorialPaciente(req);
    if (turnos.length > 0) {
        turnos.forEach(element => {
            try {
                agendaController.updatePaciente(pacienteModified, element);
            } catch (error) {
                return error;
            }
        });
    }
}

export function updatePacienteMpi(pacMpi, pacAndes, req) {
    return new Promise((resolve, reject) => {
        const pacOriginalMpi = pacMpi.toObject();
        // Asigno el objeto completo ya que está validado que proviene de MongoDb
        pacMpi = new pacienteMpi(pacAndes);
        if (req) {
            // para verificación en audit mongoose
            pacMpi.esPacienteMpi = true;
            Auth.audit(pacMpi, req);
        }
        pacMpi.save((err2) => {
            if (err2) {
                return reject(err2);
            }
            const connElastic = new ElasticSync();
            connElastic.sync(pacMpi).then(updated => {
                if (updated) {
                    Logger.log(req, 'mpi', 'update', {
                        original: pacOriginalMpi,
                        nuevo: pacMpi
                    });
                } else {
                    Logger.log(req, 'mpi', 'insert', pacMpi);
                }
                resolve(pacMpi);
            }).catch(error => {
                return reject(error);
            });
            resolve(pacMpi);
        });
    });
}

/**
 * Inserta un paciente en DB MPI
 * no accesible desde una route de la api
 *
 * @export
 * @param {any} pacienteData
 * @param {any} req
 * @returns
 */
export function postPacienteMpi(newPatientMpi, req) {
    return new Promise((resolve, reject) => {
        try {
            if (req) {
                // para verificación en audito mongoose
                newPatientMpi.esPacienteMpi = true;
                Auth.audit(newPatientMpi, req);
            }
            newPatientMpi.save((err) => {
                if (err) {
                    reject(err);
                }
                const connElastic = new ElasticSync();
                connElastic.sync(newPatientMpi).then(() => {
                    Logger.log(req, 'mpi', 'elasticInsert', {
                        nuevo: newPatientMpi,
                    });
                    resolve(newPatientMpi);
                }).catch((error) => {
                    reject(error);
                });
            });

        } catch (ex) {
            reject(ex);
        }
    });
}

/**
 * Busca un paciente en ambas DBs
 * devuelve los datos del paciente e indica en que base lo encontró
 *
 * @export
 * @param {any} id
 * @returns
 */
export function buscarPaciente(id): Promise<{ db: String, paciente: any }> {
    return new Promise((resolve, reject) => {
        paciente.findById(id, (err, data) => {
            if (err) {
                reject(err);
            } else {
                if (data) {
                    const resultado = {
                        db: 'andes',
                        paciente: data
                    };
                    resolve(resultado);
                } else {
                    pacienteMpi.findById(id, (err2, dataMpi) => {
                        if (err2) {
                            reject(err2);
                        } else if (dataMpi) {
                            const resultado = {
                                db: 'mpi',
                                paciente: dataMpi
                            };
                            resolve(resultado);
                        } else {
                            reject(null);
                        }
                    });
                }
            }
        });
    });
}

/**
 * Busca un paciente en MPI y luego en andes con cierta condición.
 * @param condition
 */

export function buscarPacienteWithcondition(condition): Promise<{ db: String, paciente: any }> {
    return new Promise((resolve, reject) => {
        pacienteMpi.findOne(condition, (err, data) => {
            if (err) {
                reject(err);
            } else {
                if (data) {
                    const resultado = {
                        db: 'mpi',
                        paciente: data
                    };
                    resolve(resultado);
                } else {
                    paciente.findOne(condition, (err2, dataMpi) => {
                        if (err2) {
                            reject(err2);
                        } else if (dataMpi) {
                            const resultado = {
                                db: 'andes',
                                paciente: dataMpi
                            };
                            resolve(resultado);
                        } else {
                            reject(null);
                        }
                    });
                }
            }
        });
    });
}

/**
 * Matching de paciente
 *
 * @param data
 */
export function matching(data) {

    const connElastic = new ElasticSync();

    let query;
    switch (data.type) {
        case 'simplequery':
            {
                query = {
                    simple_query_string: {
                        query: '\"' + data.documento + '\" + \"' + data.apellido + '\" + \"' + data.nombre + '\" +' + data.sexo,
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
                        query: data.cadenaInput,
                        type: 'cross_fields',
                        fields: ['documento', 'apellido^5', 'nombre^4'],
                        operator: 'and'
                    }
                };
            }
            break;
        case 'suggest':
            {
                // Sugiere pacientes que tengan la misma clave de blocking
                const campo = data.claveBlocking;
                const condicionMatch = {};
                condicionMatch[campo] = {
                    query: data.documento,
                    minimum_should_match: 3,
                    fuzziness: 2
                };
                query = {
                    match: condicionMatch
                };
            }
            break;
    }

    // Configuramos la cantidad de resultados que quiero que se devuelva y la query correspondiente
    const body = {
        size: 100,
        from: 0,
        query
    };

    return new Promise((resolve, reject) => {
        if (data.type === 'suggest') {

            connElastic.search(body)
                .then((searchResult) => {

                    // Asigno los valores para el suggest
                    let weights = config.mpi.weightsDefault;

                    if (data.escaneado) {
                        weights = config.mpi.weightsScan;
                    }

                    const porcentajeMatchMax = config.mpi.cotaMatchMax;
                    const porcentajeMatchMin = config.mpi.cotaMatchMin;
                    const listaPacientesMax = [];
                    const listaPacientesMin = [];

                    ((searchResult.hits || {}).hits || [])
                        .filter((hit) => {
                            const paciente2 = hit._source;
                            const pacDto = {
                                documento: data.documento ? data.documento.toString() : '',
                                nombre: data.nombre ? data.nombre : '',
                                apellido: data.apellido ? data.apellido : '',
                                fechaNacimiento: data.fechaNacimiento ? moment(new Date(data.fechaNacimiento)).format('YYYY-MM-DD') : '',
                                sexo: data.sexo ? data.sexo : ''
                            };
                            const pacElastic = {
                                documento: paciente2.documento ? paciente2.documento.toString() : '',
                                nombre: paciente2.nombre ? paciente2.nombre : '',
                                apellido: paciente2.apellido ? paciente2.apellido : '',
                                fechaNacimiento: paciente2.fechaNacimiento ? moment(paciente2.fechaNacimiento).format('YYYY-MM-DD') : '',
                                sexo: paciente2.sexo ? paciente2.sexo : ''
                            };
                            const match = new Matching();
                            const valorMatching = match.matchPersonas(pacElastic, pacDto, weights, config.algoritmo);
                            paciente2['id'] = hit._id;

                            if (valorMatching >= porcentajeMatchMax) {
                                listaPacientesMax.push({
                                    id: hit._id,
                                    paciente: paciente2,
                                    match: valorMatching
                                });
                            } else {
                                if (valorMatching >= porcentajeMatchMin && valorMatching < porcentajeMatchMax) {
                                    listaPacientesMin.push({
                                        id: hit._id,
                                        paciente: paciente2,
                                        match: valorMatching
                                    });
                                }
                            }
                        });

                    // if (devolverPorcentaje) {
                    const sortMatching = (a, b) => {
                        return b.match - a.match;
                    };

                    // cambiamos la condición para lograr que nos devuelva más de una sugerencia
                    // ya que la 1ra sugerencia es el mismo paciente.
                    if (listaPacientesMax.length > 0) {
                        listaPacientesMax.sort(sortMatching);
                        resolve(listaPacientesMax);
                    } else {
                        listaPacientesMin.sort(sortMatching);
                        resolve(listaPacientesMin);
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        } else {
            // Es para los casos de multimatch y singlequery
            connElastic.search(body)
                .then((searchResult) => {
                    const results: Array<any> = ((searchResult.hits || {}).hits || [])
                        .map((hit) => {
                            const elem = hit._source;
                            elem['id'] = hit._id;
                            return elem;
                        });
                    resolve(results);
                })
                .catch((error) => {
                    reject(error);
                });
        }
    });
}

/**
 * Delete de paciente con sincronizacion a elastic
 *
 * @param objectId ---> Id del paciente a eliminar
 */

export function deletePacienteAndes(objectId) {
    return new Promise((resolve, reject) => {
        const query = {
            _id: objectId
        };
        paciente.findById(query, (err, patientFound) => {
            if (err) {
                reject(err);
            }
            patientFound.remove();
            resolve(patientFound);
        });
    });
}

/* Funciones de operaciones PATCH */

export function updateContactos(req, data) {
    data.markModified('contacto');
    Logger.log(req, 'mpi', 'update', {
        accion: 'updateContacto',
        ruta: req.url,
        method: req.method,
        data: data.contacto,
    });
    data.contacto = req.body.contacto;
}

export function updateRelaciones(req, data) {
    data.markModified('relaciones');
    data.relaciones = req.body.relaciones;
}

export function updateDireccion(req, data) {
    data.markModified('direccion');
    data.direccion = req.body.direccion;
}

export function updateCarpetaEfectores(req, data) {
    data.markModified('carpetaEfectores');
    data.carpetaEfectores = req.body.carpetaEfectores;
}

export function linkIdentificadores(req, data) {
    data.markModified('identificadores');
    if (data.identificadores) {
        data.identificadores.push(req.body.dto);
    } else {
        data.identificadores = [req.body.dto]; // Primer elemento del array
    }
}

export function unlinkIdentificadores(req, data) {
    data.markModified('identificadores');
    if (data.identificadores) {
        data.identificadores = data.identificadores.filter(x => x.valor !== req.body.dto);
    }
}

export function updateActivo(req, data) {
    data.markModified('activo');
    data.activo = req.body.dto;
}

export function updateRelacion(req, data) {
    if (data && data.relaciones) {
        const objRel = data.relaciones.find(elem => {
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

export function deleteRelacion(req, data) {
    if (data && data.relaciones) {
        data.relaciones.find((value, index, array) => {
            if (value && value.referencia && req.body.dto && req.body.dto.referencia) {
                if (value.referencia.toString() === req.body.dto.referencia.toString()) {
                    array.splice(index, 1);
                }
            }
        });
    }
}

export function updateFotoMobile(req, data) {
    data.fotoMobile = req.body.fotoMobile;
}

export function updateScan(req, data) {
    data.markModified('scan');
    data.scan = req.body.scan;
}

export function updateCuil(req, data) {
    data.markModified('cuil');
    data.cuil = req.body.cuil;
}

export function checkCarpeta(req, data) {
    return new Promise((resolve, reject) => {
        const indiceCarpeta = req.body.carpetaEfectores.findIndex(x => x.organizacion._id === req.user.organizacion.id);
        if (indiceCarpeta > -1) {
            const query = {
                carpetaEfectores: {
                    $elemMatch: {
                        nroCarpeta: req.body.carpetaEfectores[indiceCarpeta].nroCarpeta,
                        'organizacion._id': req.body.carpetaEfectores[indiceCarpeta].organizacion._id
                    }
                }
            };
            paciente.find(query, (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve((res && res.length > 0));
            });
        } else {
            resolve(false);
        }
    });
}

/* Hasta acá funciones del PATCH */


/**
 * Busca paciente similares en MPI o ANDES. Vía mongo.
 *
 * @param {pacienteSchema} objective Paciente  buscar
 * @param {string} where Enum 'andes' | 'mpi'
 * @param {object} conditions Condiciones de busqueda
 * @param {objcet} _weights Pesos del matching
 */

export function searchSimilar(objective, where: string, conditions, _weights = null): Promise<{ value: Number, paciente: any }[]> {
    let db;
    if (where === 'andes') {
        db = paciente;
    } else {
        db = pacienteMpi;
    }
    const weights = _weights || config.mpi.weightsUpdater;
    const match = new Matching();
    return new Promise((resolve, reject) => {
        db.find(conditions).then((pacientes) => {
            const matchings: { value: Number, paciente: any }[] = [];
            if (pacientes && pacientes.length) {
                for (let i = 0; i < pacientes.length; i++) {

                    const pac = pacientes[i];
                    const valueMatch = match.matchPersonas(objective, pac, weights, config.algoritmo);

                    matchings.push({
                        paciente: pac,
                        value: valueMatch
                    });
                }

                const sortMatching = (a, b) => {
                    return b.value - a.value;
                };

                matchings.sort(sortMatching);
                return resolve(matchings);

            } else {
                return resolve(matchings);
            }
        }).catch(reject);
    });
}

/**
 *
 * @param dataPaciente
 * @param configs.operador Operador de busqueda de caves 'or' | 'and'
 * @param configs.claves Array de numeros de clave de blocking. Ver crearClaveBlockin para saber el orden de creación
 */

export async function matchPaciente(dataPaciente) {
    try {
        const connElastic = new ElasticSync();
        const query = {
            multi_match: {
                query: dataPaciente.apellido + ' ' + dataPaciente.nombre + ' ' + dataPaciente.documento,
                type: 'cross_fields',
                fields: ['documento^5', 'nombre', 'apellido^3'],
            }
        };
        const body = {
            size: 100,
            from: 0,
            query
        };

        const searchResult = await connElastic.search(body);
        const pacientes: Array<any> = ((searchResult.hits || {}).hits || []).map((hit) => {
            const elem = hit._source;
            elem['id'] = hit._id;
            return elem;
        });

        const weights = config.mpi.weightsDefault;
        const listMatching = [];
        for (const paciente2 of pacientes) {
            const pacDto = {
                documento: dataPaciente.documento ? dataPaciente.documento.toString() : '',
                nombre: dataPaciente.nombre ? dataPaciente.nombre : '',
                apellido: dataPaciente.apellido ? dataPaciente.apellido : '',
                fechaNacimiento: dataPaciente.fechaNacimiento ? moment(new Date(dataPaciente.fechaNacimiento)).format('YYYY-MM-DD') : '',
                sexo: dataPaciente.sexo ? dataPaciente.sexo : ''
            };
            const pacElastic = {
                documento: paciente2.documento ? paciente2.documento.toString() : '',
                nombre: paciente2.nombre ? paciente2.nombre : '',
                apellido: paciente2.apellido ? paciente2.apellido : '',
                fechaNacimiento: paciente2.fechaNacimiento ? moment(paciente2.fechaNacimiento).format('YYYY-MM-DD') : '',
                sexo: paciente2.sexo ? paciente2.sexo : ''
            };
            const match = new Matching();
            const valorMatching = match.matchPersonas(pacElastic, pacDto, weights, config.algoritmo);

            listMatching.push({
                value: valorMatching,
                paciente: paciente2
            });

        }

        const sortMatching = (a, b) => {
            return b.value - a.value;
        };

        listMatching.sort(sortMatching);
        return listMatching;

    } catch (e) {
        return [];
    }
}

