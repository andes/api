import { pacienteSchema } from './../schemas/paciente';
import * as config from '../../../config';
import * as moment from 'moment';
import { paciente, pacienteMpi } from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import { Matching } from '@andes/match';
import { Auth } from './../../../auth/auth.class';
import { EventCore } from '@andes/event-bus';
import * as agendaController from '../../../modules/turnos/controller/agenda';
import * as turnosController from '../../../modules/turnos/controller/turnosController';
import * as agenda from '../../../modules/turnos/schemas/agenda';
import { matchSisa } from '../../../utils/servicioSisa';
import { getServicioRenaper } from '../../../utils/servicioRenaper';
const regtest = /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ ']+/;
import * as configPrivate from '../../../config.private';
import { getServicioGeonode } from '../../../utils/servicioGeonode';
import { getGeoreferencia } from '../../../utils/serviciosGeoreferencia';
import * as Barrio from '../../tm/schemas/barrio';
import { log as andesLog } from '@andes/log';
import { logKeys } from '../../../config';
import * as mongoose from 'mongoose';
import { nextTick } from 'async';

/**
 * Crea un paciente y lo sincroniza con elastic
 *
 * @param data Datos del paciente
 * @param req  request de express para poder auditar
 */
export async function createPaciente(data, req) {
    const newPatient = new paciente(data);
    if (req) {
        Auth.audit(newPatient, req);
    }
    try {
        await newPatient.save();
        const nuevoPac = JSON.parse(JSON.stringify(newPatient));
        delete nuevoPac._id;
        delete nuevoPac.relaciones;
        delete nuevoPac.direccion;

        const connElastic = new ElasticSync();
        await connElastic.create(newPatient._id.toString(), nuevoPac);
        andesLog(req, logKeys.mpiInsert.key, req.body._id, logKeys.mpiInsert.operacion, newPatient, null);

        // Código para emitir eventos
        EventCore.emitAsync('mpi:patient:create', newPatient);
        return newPatient;
    } catch (error) {
        andesLog(req, logKeys.mpiInsert.key, req.body._id, logKeys.mpiInsert.operacion, null, 'Error insertando paciente');
        return error;
    }

}


export async function updatePaciente(pacienteObj, data, req) {
    const pacienteOriginal = pacienteObj.toObject();
    for (const key in data) {
        pacienteObj[key] = data[key];
    }
    // Habilita auditoria y guarda
    if (req) {
        // pacienteObj.markModified;
        Auth.audit(pacienteObj, req);
    }
    await pacienteObj.save();
    const connElastic = new ElasticSync();
    let updated = await connElastic.sync(pacienteObj);
    if (updated) {
        andesLog(req, logKeys.mpiUpdate.key, req.body._id, logKeys.mpiUpdate.operacion, pacienteObj, pacienteOriginal);
    } else {
        andesLog(req, logKeys.mpiInsert.key, req.body._id, logKeys.mpiInsert.operacion, pacienteObj, null);
    }
    EventCore.emitAsync('mpi:patient:update', pacienteObj);
    return pacienteObj;

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
    const turnos: any = await turnosController.getTurno(req);
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
                    andesLog(req, logKeys.mpiUpdate.key, pacMpi, 'update', pacMpi, pacOriginalMpi);
                } else {
                    andesLog(req, logKeys.mpiInsert.key, pacMpi, 'insert', pacMpi);
                }
                EventCore.emitAsync('mpi:patient:update', pacMpi);
                resolve(pacMpi);
            }).catch(error => {
                return reject(error);
            });
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
                    andesLog(req, logKeys.elasticInsert.key, newPatientMpi, 'elasticInsert', newPatientMpi);
                    EventCore.emitAsync('mpi:patient:create', newPatientMpi);
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
 * Busca un paciente en ambas DBs (Andes y MPI) segun su documento, sexo y estado validado
 * devuelve los datos del paciente
 *
 * @export
 * @param {string} documento
 * @param {string} sexo
 * @returns
 */
export function buscarPacByDocYSexo(documento, sexo): Promise<{ db: String, paciente: any }[]> {

    return new Promise((resolve, reject) => {
        let query = {
            documento,
            sexo,
            estado: 'validado' // Analizar
        };
        Promise.all([
            paciente.find(query).exec(),
            pacienteMpi.find(query).exec()
        ]).then(values => {
            let lista = [];
            lista = [...values[0], ...values[1]];
            resolve(lista);
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
export function matching(data): Promise<any[]> {

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
                    bool: {
                        must: {
                            multi_match: {
                                query: data.cadenaInput,
                                type: 'cross_fields',
                                fields: ['documento', 'apellido^5', 'nombre^4'],
                                operator: 'and'
                            }
                        },
                        filter: {
                            term: { activo: 'true' }
                        }
                    }
                };
            }
            break;
        case 'suggest':
            {
                // Sugiere pacientes que tengan la misma clave de blocking
                let campo = data.claveBlocking;
                let filter;
                if (campo === 'documento') {
                    filter = data.documento;
                } else {
                    campo = 'claveBlocking';
                    filter = data.claveBlocking; // Enviamos una clave de blocking (q sea la segunda lo estoy probando)
                }
                let condicionMatch = {};
                condicionMatch[campo] = {
                    query: filter,
                    minimum_should_match: 3,
                    fuzziness: 2
                };
                query = {
                    bool: {
                        must: {
                            match: condicionMatch
                        },
                        filter: {
                            term: { activo: 'true' }
                        }
                    }
                };
            }
            break;
        case 'search':
            {
                query = {
                    bool: {
                        must: {
                            match: data.filtros
                        },
                        filter: {
                            term: { activo: 'true' }
                        }
                    }
                };
            }
            break;
    }

    if (data.incluirInactivos) {
        delete query.bool.filter;
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
                                fechaNacimiento: data.fechaNacimiento ? moment(data.fechaNacimiento).format('YYYY-MM-DD') : '',
                                sexo: data.sexo ? data.sexo : ''
                            };
                            const pacElastic = {
                                documento: paciente2.documento ? paciente2.documento.toString() : '',
                                nombre: paciente2.nombre ? paciente2.nombre : '',
                                apellido: paciente2.apellido ? paciente2.apellido : '',
                                fechaNacimiento: paciente2.fechaNacimiento ? moment(paciente2.fechaNacimiento).format('YYYY-MM-DD') : '',
                                sexo: paciente2.sexo ? paciente2.sexo : ''
                            };
                            let match = new Matching();
                            let valorMatching = match.matchPersonas(pacElastic, pacDto, weights, config.algoritmo);

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

export async function deletePacienteAndes(objectId) {
    const query = { _id: objectId };
    let patientFound = await paciente.findById(query).exec();
    await patientFound.remove();
    let connElastic = new ElasticSync();
    await connElastic.delete(patientFound._id.toString());
    EventCore.emitAsync('mpi:patient:delete', patientFound);
    return patientFound;
}

// Borramos un paciente en la BD MPI - es necesario handlear posibles errores en la fn llamadora.
export async function deletePacienteMpi(objectId) {
    let query = { _id: objectId };
    let pacremove = await pacienteMpi.findById(query).exec();
    await pacremove.remove();
}

/* Funciones de operaciones PATCH */

export function updateContactos(req, data) {
    data.markModified('contacto');
    andesLog(req, logKeys.mpiUpdate.key, data, 'update contacto', data.contacto);
    data.contacto = req.body.contacto;
}

export function updateRelaciones(req, data) {
    data.markModified('relaciones');
    data.relaciones = req.body.relaciones;
}

export async function updateDireccion(req, data) {
    data.markModified('direccion');
    data.direccion = req.body.direccion;
    try {
        await actualizarGeoReferencia(data, req);
    } catch (err) {
        return err;
    }
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
        data.identificadores = data.identificadores.filter(x => x.valor !== req.body.dto.valor);
    }
}

export function updateActivo(req, data) {
    data.markModified('activo');
    data.activo = req.body.activo;
}

export function updateRelacion(nuevaRelacion, data) {
    if (data) {
        // verifico si el paciente tiene relaciones
        if (data.relaciones) {
            const objRel = data.relaciones.find(elem => {
                if (elem && nuevaRelacion && elem.referencia && nuevaRelacion.referencia) {
                    // checkeamos si ya existe la relacion que queremos insertar..
                    if (elem.referencia.toString() === nuevaRelacion.referencia.toString()) {
                        return elem;
                    }
                }
            });
            if (!objRel) {
                data.markModified('relaciones');
                data.relaciones.push(nuevaRelacion);
            }
        } else {
            data.markModified('relaciones');
            data.relaciones = [nuevaRelacion];
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

export async function actualizarFinanciador(req, next) {
    let resultado = await this.buscarPaciente(req.body.paciente.id);
    // por ahora se pisa la información
    // TODO: analizar como sería
    if (req.body.paciente.obraSocial) {
        if (!resultado.paciente.financiador) {
            resultado.paciente.financiador = [];
        }
        resultado.paciente.financiador[0] = req.body.paciente.obraSocial;
        resultado.paciente.markModified('financiador');

        let pacienteAndes: any;
        if (resultado.db === 'mpi') {
            pacienteAndes = new paciente(resultado.paciente.toObject());
        } else {
            pacienteAndes = resultado.paciente;
        }
        Auth.audit(pacienteAndes, req);
        pacienteAndes.save((errPatch) => {
            if (errPatch) {
                return next(errPatch);
            }
            return;
        });
    }
}

export async function checkCarpeta(req, data) {
    if (req.body && req.body.carpetaEfectores) {

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
            let unPaciente = await paciente.find(query).exec();
            return (unPaciente && unPaciente.length > 0);
        } else {
            return null;
        }
    } else {
        return null;
    }
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

/**
 *  Devuelve un array de pacientes similares al ingresado por parámetro
 *  Utiliza
 *
 * @param {*} nuevoPaciente
 * @returns Promise<boolean> || error
 */
export async function checkRepetido(nuevoPaciente): Promise<{ resultadoMatching: any[], dniRepetido: boolean, macheoAlto: boolean }> {
    let matchingInputData = {
        type: 'suggest',
        claveBlocking: 'documento',
        percentage: true,
        apellido: nuevoPaciente.apellido,
        nombre: nuevoPaciente.nombre,
        documento: nuevoPaciente.documento,
        sexo: ((typeof nuevoPaciente.sexo === 'string')) ? nuevoPaciente.sexo : (Object(nuevoPaciente.sexo).id),
        fechaNacimiento: nuevoPaciente.fechaNacimiento
    };

    let candidatos = await matching(matchingInputData);  // Handlear error en funcion llamadora
    // Filtramos al propio paciente y a los resultados por debajo de la cota minima
    candidatos = candidatos.filter(elem => {
        return (elem.paciente.id !== nuevoPaciente.id) && (elem.match > config.mpi.cotaMatchMin);
    });

    // Extraemos los validados de los resultados
    let similaresValidados = candidatos.filter(elem => elem.paciente.estado === 'validado');
    // Si el nuevo paciente está validado, filtramos los candidatos temporales
    if (nuevoPaciente.estado === 'validado') {
        candidatos = similaresValidados;
    }

    let macheoAlto = (candidatos.filter(element => element.match > config.mpi.cotaMatchMax).length > 0);
    let dniRepetido = similaresValidados.filter(element =>
        (element.paciente.sexo.toString() === matchingInputData.sexo.toString() && element.paciente.documento.toString() === matchingInputData.documento.toString())
    ).length > 0;

    let promiseArray = [];
    for (let resultado of candidatos) {
        let idPaciente = mongoose.Types.ObjectId(resultado.paciente.id);
        promiseArray.push(buscarPaciente(idPaciente));
    }
    let arrayAuxiliar = await Promise.all(promiseArray);
    let resultadoMatching = [];
    for (let index = 0; index < arrayAuxiliar.length; index++) {
        let pacienteCandidato = arrayAuxiliar[index].paciente;
        resultadoMatching.push({ paciente: pacienteCandidato });
        resultadoMatching[index].match = candidatos[index].match;
    }
    return { resultadoMatching, dniRepetido, macheoAlto };
}

/**
 * Intenta validar un paciente con fuentes auténticas.
 * Devuelve el paciente, y si fue validado o no (true/false)
 *
 * @param {*} pacienteAndes
 * @returns Object Paciente
 */
export async function validarPaciente(pacienteAndes, req: any = configPrivate.userScheduler) {
    let sexoPaciente = ((typeof pacienteAndes.sexo === 'string')) ? pacienteAndes.sexo : (Object(pacienteAndes.sexo).id);
    if (sexoPaciente === 'otro') {
        return { paciente: pacienteAndes, validado: false };
    }
    let sexoQuery = sexoPaciente === 'masculino' ? 'M' : 'F';
    let resRenaper: any;

    try {
        resRenaper = await getServicioRenaper({ documento: pacienteAndes.documento, sexo: sexoQuery });
        andesLog(req, logKeys.validacionPaciente.key, pacienteAndes._id, logKeys.validacionPaciente.operacion, resRenaper);
    } catch (error) {
        andesLog(req, logKeys.validacionPaciente.key, pacienteAndes._id, logKeys.validacionPaciente.operacion, null, 'Error validando paciente por RENAPER');
        return await validarSisa(pacienteAndes, req);
    }
    let band = true;
    // Respuesta correcta de renaper?
    if (resRenaper && resRenaper.datos && resRenaper.datos.nroError === 0) {
        let pacienteRenaper = resRenaper.datos;
        band = regtest.test(pacienteRenaper.nombres);
        band = band || regtest.test(pacienteRenaper.apellido);
        if (!band) {
            pacienteAndes.nombre = pacienteRenaper.nombres;
            pacienteAndes.apellido = pacienteRenaper.apellido;
            pacienteAndes.fechaNacimiento = new Date(pacienteRenaper.fechaNacimiento);
            pacienteAndes.cuil = pacienteRenaper.cuil;
            pacienteAndes.estado = 'validado';
            pacienteAndes.foto = pacienteRenaper.foto;
            if (pacienteAndes.direccion.length) {
                pacienteAndes.direccion[0].valor = pacienteRenaper.calle + ' ' + pacienteRenaper.numero;
            }
            return { paciente: pacienteAndes, validado: true };
        } else {
            return await validarSisa(pacienteAndes, req, pacienteRenaper.foto);

        }
    } else {
        return await validarSisa(pacienteAndes, req);
    }
}

async function validarSisa(pacienteAndes: any, req: any, foto = null) {
    try {
        let sexoPaciente = ((typeof pacienteAndes.sexo === 'string')) ? pacienteAndes.sexo : (Object(pacienteAndes.sexo).id);

        pacienteAndes.sexo = sexoPaciente;
        let resSisa: any = await matchSisa(pacienteAndes);
        andesLog(req, logKeys.validacionPaciente.key, pacienteAndes._id, logKeys.validacionPaciente.operacion, resSisa);

        pacienteAndes.nombre = resSisa.matcheos.datosPaciente.nombre;
        pacienteAndes.apellido = resSisa.matcheos.datosPaciente.apellido;
        pacienteAndes.fechaNacimiento = resSisa.matcheos.datosPaciente.fechaNacimiento;
        pacienteAndes.estado = 'validado';
        if (foto) {
            pacienteAndes.foto = foto;
        }
        return { paciente: pacienteAndes, validado: true };
    } catch (error) {
        andesLog(req, logKeys.validacionPaciente.key, pacienteAndes._id, logKeys.validacionPaciente.operacion, null, 'Error validando paciente por SISA');
        // no hacemos nada con el paciente
        return { paciente: pacienteAndes, validado: false };
    }
}

/**
 * * Segun la entrada, retorna un Point con las coordenadas de geo referencia o null.
 * @param data debe contener direccion y localidad.
 */

export async function actualizarGeoReferencia(dataPaciente, req) {
    try {
        let pacienteOriginal = dataPaciente;
        // (valores de direccion fueron modificados): están completos?
        if (dataPaciente.direccion[0].valor && dataPaciente.direccion[0].ubicacion.localidad && dataPaciente.direccion[0].ubicacion.provincia) {
            // si el paciente no fue georeferenciado
            if (!dataPaciente.direccion[0].georeferencia) {
                let dir = dataPaciente.direccion[0].valor + ', ' + dataPaciente.direccion[0].ubicacion.localidad.nombre + ', ' + dataPaciente.direccion[0].ubicacion.provincia.nombre;
                const geoRef: any = await getGeoreferencia(dir);
                // georeferencia exitosa?
                if (geoRef && geoRef.lat) {
                    dataPaciente.direccion[0].geoReferencia = [geoRef.lat, geoRef.lng];
                    let nombreBarrio = await getServicioGeonode(dataPaciente.direccion[0].geoReferencia);
                    // consulta exitosa?
                    if (nombreBarrio) {
                        const barrioPaciente = await Barrio.findOne().where('nombre').equals(RegExp('^.*' + nombreBarrio + '.*$', 'i'));
                        if (barrioPaciente) {
                            dataPaciente.direccion[0].ubicacion.barrio = barrioPaciente;
                        }
                    }
                } else {
                    dataPaciente.direccion[0].geoReferencia = null;
                    dataPaciente.direccion[0].ubicacion.barrio = null;
                }
            }
            if (req) {
                // se guardan los datos
                updatePaciente(pacienteOriginal, dataPaciente, req);
            }
        } else {
            if (dataPaciente.direccion[0].georeferencia) {
                if (req) {
                    // se guardan los datos
                    updatePaciente(pacienteOriginal, dataPaciente, req);
                }
            }
        }
    } catch (err) {
        return (err);
    }
}

export async function getHistorialPaciente(req, dataPaciente) {
    try {
        let pipelineTurno = [];
        let pipelineSobreturno = [];
        if (req.query.turnosProximos) {
            pipelineTurno.push({ $match: { horaInicio: { $gte: moment().startOf('day').toDate() } } });
            pipelineSobreturno.push({ $match: { horaInicio: { $gte: moment().startOf('day').toDate() } } });
        }
        if (req.query.organizacion) {
            pipelineTurno.push({ $match: { 'organizacion._id': { $eq: new mongoose.Types.ObjectId(Auth.getOrganization(req)) } } });
            pipelineSobreturno.push({ $match: { 'organizacion._id': { $eq: new mongoose.Types.ObjectId(Auth.getOrganization(req)) } } });
        }
        if (req.query.conceptId) {
            pipelineTurno.push({ $match: { 'tipoPrestaciones.conceptId': req.query.conceptId } });
            pipelineSobreturno.push({ $match: { 'tipoPrestaciones.conceptId': req.query.conceptId } });
        }
        const turnos = [];
        let turno;
        pipelineTurno.push(

            {
                $match: {
                    estado: {
                        $in: [
                            'publicada',
                            'pendienteAsistencia',
                            'pendienteAuditoria',
                            'auditada',
                            'disponible',
                            'pausada'
                        ]
                    },
                    'bloques.turnos.paciente.id': { $in: dataPaciente.vinculos }
                }
            },
            {
                $unwind: {
                    path: '$bloques'
                }
            },
            {
                $unwind: {
                    path: '$bloques.turnos'
                }
            },
            {
                $match: {
                    'bloques.turnos.paciente.id': { $in: dataPaciente.vinculos }
                }
            },
            {
                $group: {
                    _id: {
                        id: '$_id',
                        turnoId: '$bloques.turnos._id'
                    },
                    agenda_id: {
                        $first: '$_id'
                    },
                    bloque_id: { $first: '$bloques._id' },
                    organizacion: {
                        $first: '$organizacion'
                    },
                    profesionales: {
                        $first: '$profesionales'
                    },
                    turno: {
                        $first: '$bloques.turnos'
                    },
                    espacioFisico: {
                        $first: '$espacioFisico'
                    }
                }
            },
            {
                $sort: {
                    'turno.horaInicio': -1.0
                }
            }
        );
        pipelineSobreturno.push(

            {
                $match: {
                    estado: {
                        $in: [
                            'publicada',
                            'pendienteAsistencia',
                            'pendienteAuditoria',
                            'auditada',
                            'disponible',
                            'pausada'
                        ]
                    },
                    'sobreturnos.paciente.id': { $in: dataPaciente.vinculos }
                }
            },
            {
                $unwind: {
                    path: '$sobreturnos'
                }
            },
            {
                $match: {
                    'sobreturnos.paciente.id': { $in: dataPaciente.vinculos }
                }
            },
            {
                $group: {
                    _id: {
                        id: '$_id',
                        turnoId: '$sobreturnos._id'
                    },
                    agenda_id: {
                        $first: '$_id'
                    },
                    organizacion: {
                        $first: '$organizacion'
                    },
                    profesionales: {
                        $first: '$profesionales'
                    },
                    turno: {
                        $first: '$sobreturnos'
                    },
                    espacioFisico: {
                        $first: '$espacioFisico'
                    }
                }
            },
            {
                $sort: {
                    'turno.horaInicio': -1.0
                }
            }

        );
        let data2 = await agenda.aggregate(pipelineTurno).exec();
        const sobreturnos = await agenda.aggregate(pipelineSobreturno).exec();
        data2 = data2.concat(sobreturnos);
        data2.forEach(elem => {
            turno = elem.turno;
            turno.id = turno._id;
            turno.agenda_id = elem.agenda_id;
            turno.bloque_id = (elem.bloque_id) ? elem.bloque_id : null;
            turno.organizacion = elem.organizacion;
            turno.profesionales = elem.profesionales;
            turno.paciente = elem.turno.paciente;
            turno.espacioFisico = elem.espacioFisico;
            turnos.push(turno);
        });
        return (turnos);
    } catch (error) {
        return (error);
    }
}
