import * as config from '../../../config';
import * as sql from 'mssql';
// import * as operationsSumar from './../../../modules/facturacionAutomatica/controllers/operationsCtrl/operationsSumar';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import { paciente, pacienteMpi } from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import { Logger } from '../../../utils/logService';
import { Matching } from '@andes/match';
import { Auth } from './../../../auth/auth.class';
import { EventCore } from '@andes/event-bus';
import * as agendaController from '../../../modules/turnos/controller/agenda';
import * as turnosController from '../../../modules/turnos/controller/turnosController';
import * as operacionesLegacy from './../../../modules/legacy/controller/operations';
import * as organizacion from '../../../core/tm/schemas/organizacion';
import { toArray } from '../../../utils/utils';
let to_json = require('xmljson').to_json;
import * as https from 'https';
import * as sisaController from '../../../modules/fuentesAutenticas/controller/sisaController';
import { Puco } from '../../../modules/obraSocial/schemas/puco';
import * as agendaSchema from '../../../modules/turnos/schemas/agenda';
import * as prestacionSchema from '../../../modules/rup/schemas/prestacion';
import { getPosition } from '../../../modules/turnos/controller/agenda';

/**
 * Crea un paciente y lo sincroniza con elastic
 *
 * @param data Datos del paciente
 * @param req  request de express para poder auditar
 */


let poolAgendas;
let configSql = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database,
    requestTimeout: 45000
};
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
                // Código para emitir eventos
                EventCore.emitAsync('mpi:patient:create', newPatient);
                //
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
                EventCore.emitAsync('mpi:patient:update', pacienteObj);
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
            paciente.find(query),
            pacienteMpi.find(query)
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
                return reject(err);
            }
            patientFound.remove();
            EventCore.emitAsync('mpi:patient:delete', patientFound);
            return resolve(patientFound);
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

async function obtenerVersiones() {
    let versiones = await Puco.distinct('version').exec();  // esta consulta obtiene un arreglo de strings
    for (let i = 0; i < versiones.length; i++) {
        versiones[i] = { version: versiones[i] };
    }
    versiones.sort((a, b) => compare(a.version, b.version));
    return versiones;
}

function compare(a, b) {
    if (new Date(a) > new Date(b)) {
        return -1;
    }
    if (new Date(a) < new Date(b)) {
        return 1;
    }
    return 0;
}

export async function mapeoPuco(dni) {

    let padron;
    padron = await obtenerVersiones();   // trae las distintas versiones de los padrones
    padron = padron[0].version;
    let salida = await Puco.findOne({ dni, version: padron }, {}, function (err, data: any) { });

    return salida;
}


export async function insertSips() {

    let datos: any = await pacientesDelDia();
    for (let index = 0; index < datos.length; index++) {
        let existeEnSips = await getPacienteSips(datos[index].paciente.documento);
        // let existeEnPuco: any = await operacionesLegacy.postPuco(pacientes[index].documento)
        let esBeneficiario = await getBeneficiario(datos[index].paciente.documento);
        let edad = moment().diff(datos[index].paciente.fechaNacimiento, 'years');
        let efector = await mapeoEfector(datos[index].paciente.organizacionId);
        // si esta en sips pero esta como desactivado lo activo
        if (existeEnSips.length > 0) {
            if (existeEnSips[0].activo === false) {

                await updateEstadoSips(existeEnSips[0].idPaciente);
            }

        }
        // si no esta en sips o
        if (existeEnSips.length === 0) {
            let pacienteSips = await operacionesLegacy.pacienteSipsFactory(datos[index].paciente, efector.idEfector);
            let idPacienteSips = await operacionesLegacy.insertaPacienteSips(pacienteSips);
        }
        // let existeEnPuco: any = await sisaController.postPuco(pacientes[index].documento);
        let existeEnPuco: any = await this.mapeoPuco(datos[index].paciente.documento);

        // si no existe en puco entra para hacer la validacion con afiliados y beneficiarios
        if (!existeEnPuco) {
            let existeEnAfiliado = await getAfiliadoSumar(datos[index].paciente.documento);
            // si esta en la tabla afiliados va a actualizar la obra social del turno
            if (existeEnAfiliado) {
                console.log(datos[index]);
                if (datos[index].origen === 'agendas') {
                    console.log(datos[index]);
                    console.log('actualizo turno', await actualizarTurno(datos[index].idTurno));
                }
            } else {
                if (edad <= 64) {
                    console.log('sumar');
                    if (esBeneficiario.length === 0) {
                        // FALTA EL EFECTOR
                        let benef = beneficiarioFactory(datos[index].paciente, efector.cuie);
                        await insertBeneficiario(benef);
                    }
                }
            }

        }


    }


}


export async function actualizarTurno(idTurno) {
    agendaSchema.find({
        'bloques.turnos._id': idTurno
    }).exec(function (err, data: any) {
        let indexs = getPosition(null, data[0], idTurno);
        let turno = data[0].bloques[indexs.indexBloque].turnos[indexs.indexTurno];
        turno.paciente.obraSocial = {
            codigoPuco: 499,
            nombre: 'Sumar'
        };
        Auth.audit(data[0], configPrivate.userScheduler);
        data[0].save((err2, result) => {
        });
    });
}

export async function mapeoEfector(idEfector) {
    let efectorMongo: any = await mapeoEfectorMongo(idEfector);

    poolAgendas = await new sql.ConnectionPool(configSql).connect();
    let query = 'SELECT * FROM dbo.Sys_efector WHERE cuie = @codigo';
    let resultado = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), efectorMongo.codigo.cuie)
        .query(query);
    poolAgendas.close();

    return resultado.recordset[0];
}

/* Se trae el efector de mongo por ObjectId*/
async function mapeoEfectorMongo(idEfector: any) {
    return new Promise((resolve, reject) => {
        organizacion.model.findById(idEfector).then(efector => {
            resolve(efector);
        });
    });
}


export async function getPacienteSips(documento) {

    poolAgendas = await new sql.ConnectionPool(configSql).connect();
    let query = 'SELECT * FROM dbo.Sys_Paciente WHERE numeroDocumento = @documento';
    let resultado = await new sql.Request(poolAgendas)
        .input('documento', sql.VarChar(50), documento)
        .query(query);
    poolAgendas.close();
    resultado = resultado.recordset;

    return resultado;
}

export async function getBeneficiario(documento) {

    poolAgendas = await new sql.ConnectionPool(configSql).connect();
    let query = 'SELECT * FROM dbo.PN_beneficiarios  WHERE numero_doc = @documento';
    let resultado = await new sql.Request(poolAgendas)
        .input('documento', sql.VarChar(50), documento)
        .query(query);
    poolAgendas.close();
    resultado = resultado.recordset;

    return resultado;
}

export async function getAfiliadoSumar(documento) {
    poolAgendas = await new sql.ConnectionPool(configSql).connect();
    let query = 'SELECT * FROM dbo.PN_smiafiliados WHERE afidni = @documento AND activo = @activo';
    let resultado = await new sql.Request(poolAgendas)
        .input('documento', sql.VarChar(50), documento)
        .input('activo', sql.VarChar(1), 'S')
        .query(query);
    poolAgendas.close();
    return resultado.recordset[0] ? resultado.recordset[0] : null;
}

export async function updateEstadoSips(id) {
    poolAgendas = await new sql.ConnectionPool(configSql).connect();
    let query = 'UPDATE  [dbo].[Sys_Paciente] SET activo = 1 where idPaciente = @id';
    let resultado = await new sql.Request(poolAgendas)
        .input('id', sql.VarChar(50), id)
        .query(query);
    poolAgendas.close();
    resultado = resultado.recordset;

    return resultado;
}

export async function pacientesDelDia() {
    // busca los pacientes del dia en mpi y andes para validarlos con sips y pn beneficiarios
    // TODO: DEBEMOS BUSCAR LOS PACIENTES DIA VENCIDO


    let hoyDesde = moment(new Date()).startOf('day').format();
    let hoyHasta = moment(new Date()).endOf('day').format();
    let pacientesTotal = [];
    // let start = moment(req.query.fechaDesde).startOf('day').toDate();
    // let end = moment(req.query.fechaHasta).endOf('day').toDate();

    // PACIENTES ANDES
    let pacientesAgenda = await toArray(agendaSchema.aggregate([
        { $unwind: '$bloques' },
        { $unwind: '$bloques.turnos' },
        {
            $match: {
                $and: [
                    { createdAt: { $gte: new Date(hoyDesde), $lte: new Date(hoyHasta) } },
                    { 'bloques.turnos.estado': { $eq: 'asignado' } },
                ]
            }
        }

    ]).cursor({}).exec());


    pacientesAgenda.forEach(element => {
        element.bloques.turnos.paciente['organizacionId'] = element.organizacion._id;
        pacientesTotal.push({
            paciente: element.bloques.turnos.paciente,
            idTurno: element.bloques.turnos._id,
            origen: 'agendas'
        });
    });

    // // PACIENTES MPI
    let prestaciones = await toArray(prestacionSchema.model.aggregate([{
        $match: {
            $and: [
                { createdAt: { $gte: new Date(hoyDesde), $lte: new Date(hoyHasta) } },
                { 'solicitud.turno': { $exists: false } }
            ]
        }
    }]).cursor({ batchSize: 1000 }).exec());

    prestaciones.forEach(element => {
        element.paciente['organizacionId'] = element.solicitud.organizacion.id;

        pacientesTotal.push({
            paciente: element.paciente,
            origen: 'prestaciones'
        });
    });

    console.log(pacientesTotal);
    return pacientesTotal;
}

// export async function pacientesDelDia() {
//     // busca los pacientes del dia en mpi y andes para validarlos con sips y pn beneficiarios
//     // TODO: DEBEMOS BUSCAR LOS PACIENTES DIA VENCIDO


//     let hoyDesde = moment(new Date()).startOf('day').format();
//     let hoyHasta = moment(new Date()).endOf('day').format();
//     let pacientesTotal = [];
//     // let start = moment(req.query.fechaDesde).startOf('day').toDate();
//     // let end = moment(req.query.fechaHasta).endOf('day').toDate();

//     // PACIENTES ANDES
//     let pacientesAndes = await toArray(paciente.aggregate([{
//         $match: {
//             'createdAt': {
//                 $gte: new Date(hoyDesde), $lte: new Date(hoyHasta)
//             }
//         }
//     }]).cursor({ batchSize: 1000 }).exec());


//     pacientesAndes.forEach(element => {
//         pacientesTotal.push(element);
//     });

//     // PACIENTES MPI
//     let pacientesMpi = await toArray(pacienteMpi.aggregate([{
//         $match: {
//             'createdAt': {
//                 $gte: new Date(hoyDesde), $lte: new Date(hoyHasta)
//             }
//         }
//     }]).cursor({ batchSize: 1000 }).exec());

//     pacientesMpi.forEach(element => {
//         pacientesTotal.push(element);
//     });

//     return pacientesTotal;
// }

function beneficiarioFactory(paciente, efector) {
    let tipoCategoria;
    let edad = moment().diff(paciente.fechaNacimiento, 'years');
    if ((edad >= 0) && (edad <= 10)) {
        tipoCategoria = 4;
    } else if ((edad > 10) && (edad <= 19)) {
        tipoCategoria = 5;
    } else if ((edad > 19) && (edad <= 64)) {

        if (paciente.idSexo === 2) {
            tipoCategoria = 6;
        } else {
            tipoCategoria = 7;
        }
    }
    let beneficiario = {
        id: null,
        estado_enviado: 'n',
        clave_beneficiario: 2101300000000000, // falta sumar id
        tipo_transaccion: 'A',
        apellido: paciente.apellido,
        nombre: paciente.nombre,
        clase_doc: null,
        tipo_documento: 'DNI',
        numero_doc: paciente.documento,
        id_categoria: tipoCategoria,
        sexo: (paciente.sexo === 'masculino' ? 'M' : paciente.sexo === 'femenino' ? 'F' : 'I'),
        fechaNacimiento: moment(paciente.fechaNacimiento).format('YYYY-MM-DD'),
        pais: 'ARGENTINA',
        indigena: 'N',
        idTribu: 0,
        idLengua: 0,
        anioMayorNivel: 0,
        anioMayorNivelMadre: 0,
        cuie_ea: efector,
        cuie_ah: efector,
        fecha_carga: moment(new Date()).format('YYYY-MM-DD'),
        fecha_inscripcion: moment(new Date()).format('YYYY-MM-DD'),

    };
    return beneficiario;
}

async function insertBeneficiario(paciente) {

    let query = 'INSERT INTO [dbo].[PN_beneficiarios] (estado_envio ,clave_beneficiario ,tipo_transaccion ,apellido_benef ,nombre_benef ,clase_documento_benef ,tipo_documento ,numero_doc ,id_categoria ,sexo ,fecha_nacimiento_benef ,provincia_nac ,localidad_nac ,pais_nac ,indigena ,id_tribu ,id_lengua ,alfabeta ,estudios ,anio_mayor_nivel ,tipo_doc_madre ,nro_doc_madre ,apellido_madre ,nombre_madre ,alfabeta_madre ,estudios_madre ,anio_mayor_nivel_madre ,tipo_doc_padre ,nro_doc_padre ,apellido_padre ,nombre_padre ,alfabeta_padre ,estudios_padre ,anio_mayor_nivel_padre ,tipo_doc_tutor ,nro_doc_tutor ,apellido_tutor ,nombre_tutor ,alfabeta_tutor ,estudios_tutor ,anio_mayor_nivel_tutor ,fecha_diagnostico_embarazo ,semanas_embarazo ,fecha_probable_parto ,fecha_efectiva_parto ,cuie_ea ,cuie_ah ,menor_convive_con_adulto ,calle ,numero_calle ,piso ,dpto ,manzana ,entre_calle_1 ,entre_calle_2 ,telefono ,departamento ,localidad ,municipio ,barrio ,cod_pos ,observaciones ,fecha_inscripcion ,fecha_carga ,usuario_carga ,activo ,fum ,tipo_ficha ,responsable ,discv ,disca ,discmo ,discme ,otradisc ,' +
        'rcv) VALUES(' +
        '\'' + paciente.estado_enviado + '\',' + '\'' + paciente.clave_beneficiario + '\',' + '\'' + paciente.tipo_transaccion + '\',' + '\'' + paciente.apellido + '\',' + '\'' + paciente.nombre + '\',' + '' + '\'P\',\'' +
        paciente.tipo_documento + '\',' + '\'' + paciente.numero_doc + '\',' + '\'' + paciente.id_categoria + '\',' + '\'' + paciente.sexo + '\',' + '\'' + paciente.fechaNacimiento + '\',' + '' +
        null + ',' + null + ',' + '\'' + paciente.pais + '\',' + '\'' + paciente.indigena + '\',' + '' + paciente.idTribu + ',' + '' + paciente.idLengua + ',' + '' + null + ',' + '' + null + ',' + '' + paciente.anioMayorNivel + ',' + '' + null + ',' + '' + null + ',' + '' +
        null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + 0 + ',' + '' + paciente.anioMayorNivelMadre + ',' + '' + null + ',' +
        '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' +
        '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '\'' + paciente.cuie_ah + '\',' +
        '\'' + paciente.cuie_ea + '\',' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' +
        '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' +
        '' + 0 + ',' + '\'' + paciente.fecha_inscripcion + '\',' + '' + null + ',' + '\'' + paciente.fecha_carga + '\',' + '' + null + ',' + '' + null + ',' + '' + null + ',' +
        '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + ',' + '' + null + '' + ')';
    let idComprobante = await executeQueryBeneficiario(query);

    return idComprobante;
}

async function executeQueryBeneficiario(query: any) {
    try {
        let id;
        query += ' select SCOPE_IDENTITY() as id';
        poolAgendas = await new sql.ConnectionPool(configSql).connect();
        let result = await new sql.Request(poolAgendas).query(query);
        if (result && result.recordset) {
            id = result.recordset[0].id;
        }
        let queryUpdate = 'UPDATE  [dbo].[PN_beneficiarios] SET clave_beneficiario = ' + (2101300000000000 + parseInt(id)) + ' where id_beneficiarios = ' + id + '  ';

        let resultUpdate = await new sql.Request(poolAgendas).query(queryUpdate);
        if (resultUpdate && resultUpdate.recordset) {
            return resultUpdate.recordset[0].clave_beneficiario;
        }

    } catch (err) {
        return (err);
    }
}

