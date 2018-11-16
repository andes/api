import * as mongoose from 'mongoose';
import * as constantes from '../schemas/constantes';
import * as moment from 'moment';
import {
    agendasCache
} from '../schemas/agendasCache';
import {
    profesional
} from './../../../core/tm/schemas/profesional';
import * as organizacion from './../../../core/tm/schemas/organizacion';
import * as sql from 'mssql';
import * as sisaController from '../../../modules/fuentesAutenticas/controller/sisaController';
import { configuracionPrestacionModel } from '../../../core/term/schemas/configuracionPrestacion';
import { mapeoPuco } from '../../../modules/obraSocial/controller/obraSocial';
import * as configPrivate from '../../../config.private';

let configSql = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database,
    requestTimeout: 45000
};

// Funciones privadas
function traeProfesionalPorId(id) {
    return new Promise((resolve, reject) => {
        profesional.findById(mongoose.Types.ObjectId(id), (err, unProfesional) => {
            if (err) {
                return reject(err);
            }
            return resolve(unProfesional);
        });
    });
}
/** Dada una lista de profesionales, devuelve una lista de profesionales completa */
function profesionalCompleto(lstProfesionales): any {
    return new Promise((resolve, reject) => {
        const listaProf = [];
        let counter = 0;
        lstProfesionales.forEach(async prof => {
            const pro = await traeProfesionalPorId(prof.id);
            counter++;
            listaProf.push(pro);
            // Esto es una mersada pero no me doy cuenta como hacerlo mejor
            if (counter === lstProfesionales.length) {
                return resolve(listaProf);
            }
        });
    });
}
/** Dado un id de Organización devuelve el objeto completo */
function organizacionCompleto(idOrganizacion): any {
    return new Promise((resolve, reject) => {
        organizacion.model.findById(mongoose.Types.ObjectId(idOrganizacion), (err, unaOrganizacion) => {
            if (err) {
                return reject(err);
            }
            return resolve(unaOrganizacion);
        });
    });
}

// Funciones públicas
export function noExistCDA(protocol, dniPaciente) {
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'select * from LAB_ResultadoEncabezado where idProtocolo = ' + protocol + ' and numeroDocumento =  ' + dniPaciente;
            const result = await new sql.Request().query(query);
            if (result[0].cda) {
                return resolve(null); // Si ya tiene el cda no hacer nada
            } else {
                return resolve(result[0]); // Si no tiene cda asociado devuelve el objeto
            }
        } catch (ex) {
            return reject(null);
        }
    });
}

export function setMarkProtocol(protocol, documento, idCda) {
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'UPDATE LAB_ResultadoEncabezado set cda = ' + '\'' + idCda + '\'' + ' where idProtocolo = ' + protocol + ' and numeroDocumento = ' + documento;
            const result = await new sql.Request().query(query);
            resolve(result);
        } catch (ex) {
            reject(null);
        }
    });
}

export function organizacionBySisaCode(code): any {
    return new Promise((resolve, reject) => {
        organizacion.model.findOne({
            'codigo.sisa': code
        }, (err, doc: any) => {
            if (err) {
                return reject(err);
            }
            if (doc) {
                const org = {
                    _id: doc.id,
                    nombre: doc.nombre,
                };
                return resolve(org);
            } else {
                return reject({});
            }
        });
    });
}

export function getEncabezados(documento): any {
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'select efector.codigoSisa as efectorCodSisa, efector.nombre as efector, encabezado.idEfector as idEfector, encabezado.apellido, encabezado.nombre, encabezado.fechaNacimiento, encabezado.sexo, ' +
                'encabezado.numeroDocumento, encabezado.fecha, encabezado.idProtocolo, encabezado.solicitante from LAB_ResultadoEncabezado as encabezado ' +
                'inner join Sys_Efector as efector on encabezado.idEfector = efector.idEfector ' +
                'where encabezado.numeroDocumento = ' + documento + ' and efector.codigoSisa<> ' + '\'' + 0 + '\'';
            const result = await new sql.Request().query(query);
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });
}


export async function getDetalles(idProtocolo, idEfector) {
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'select grupo, item, resultado, valorReferencia, observaciones, hiv, profesional_val ' +
                ' from LAB_ResultadoDetalle as detalle where esTitulo = \'No\' and detalle.idProtocolo = ' + idProtocolo + ' and detalle.idEfector = ' + idEfector;
            const result = await new sql.Request().query(query);
            resolve(result);
        } catch (err) {
            reject(err);
        }
    });
}

export async function pacienteSipsFactory(paciente: any, idEfectorSips: any) {
    return {
        idEfector: idEfectorSips,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        numeroDocumento: paciente.documento,
        idSexo: (paciente.sexo === 'masculino' ? 3 : paciente.sexo === 'femenino' ? 2 : 1),
        fechaNacimiento: moment(paciente.fechaNacimiento).format('YYYYMMDD'),
        idEstado: 3 ,
        // idEstado: mapeoEstado(paciente.estado),
        /* Estado Validado en SIPS*/
        idMotivoNI: 0,
        idPais: 54,
        idProvincia: 139,
        idNivelInstruccion: 0,
        idSituacionLaboral: 0,
        idProfesion: 0,
        idOcupacion: 0,
        calle: '',
        numero: 0,
        piso: '',
        departamento: '',
        manzana: '',
        idBarrio: -1,
        idLocalidad: 52,
        idDepartamento: 557,
        idProvinciaDomicilio: 139,
        referencia: '',
        informacionContacto: '',
        cronico: 0,
        idObraSocial: await codigoPucoPorDni(paciente.documento),
        idUsuario: '1486739', // ID USUARIO POR DEFECTO
        fechaAlta: moment().format('YYYYMMDD HH:mm:ss'),
        fechaDefuncion: '19000101',
        fechaUltimaActualizacion: moment().format('YYYYMMDD HH:mm:ss'),
        idEstadoCivil: 0,
        idEtnia: 0,
        idPoblacion: 0,
        idIdioma: 0,
        otroBarrio: '',
        camino: '',
        campo: '',
        esUrbano: 1,
        lote: '',
        parcela: '',
        edificio: '',
        activo: 1,
        fechaAltaObraSocial: '19000101',
        numeroAfiliado: null,
        numeroExtranjero: '',
        telefonoFijo: 0,
        telefonoCelular: 0,
        email: '',
        latitud: 0,
        longitud: 0,
        objectId: paciente._id ? paciente._id : paciente.id
    };
}

async function codigoPucoPorDni(dni) {
    let idObraSocial;
    let obraSocial: any = await mapeoPuco(dni);
    if (obraSocial) {
        idObraSocial = await mapeoObraSocial(obraSocial.codigoFinanciador);
        if (idObraSocial === 0) {
            idObraSocial = 499;
        }
    } else {
        idObraSocial = 499;

    }

    return idObraSocial;

}


function mapeoEstado(estado) {
    let res;
    if (estado === 'temporal') {
        res = 2;
    }
    if (estado === 'validado') {
        res = 3;
    }
    return res;

}


export async function mapeoObraSocial(codigoObraSocial) {
    let query = 'SELECT idObraSocial, cod_puco FROM dbo.Sys_ObraSocial WHERE cod_PUCO = ' + codigoObraSocial + ';';
    let result = await new sql.Request().query(query);
    return result.recordset[0] ? result.recordset[0].idObraSocial : 0;
}

export async function insertaPacienteSips(paciente: any) {
    return new Promise(async  (resolve, reject) => {
        try {
            let idPacienteGrabadoSips;
            let idPaciente = await existepaciente(paciente);

            if (idPaciente === 0) {

                let query = 'INSERT INTO dbo.Sys_Paciente ' +
                    ' ( idEfector ,' +
                    ' apellido , ' +
                    ' nombre, ' +
                    ' numeroDocumento, ' +
                    ' idSexo, ' +
                    ' fechaNacimiento, ' +
                    ' idEstado, ' +
                    ' idMotivoNI, ' +
                    ' idPais, ' +
                    ' idProvincia, ' +
                    ' idNivelInstruccion, ' +
                    ' idSituacionLaboral, ' +
                    ' idProfesion, ' +
                    ' idOcupacion, ' +
                    ' calle, ' +
                    ' numero, ' +
                    ' piso, ' +
                    ' departamento, ' +
                    ' manzana, ' +
                    ' idBarrio, ' +
                    ' idLocalidad, ' +
                    ' idDepartamento, ' +
                    ' idProvinciaDomicilio, ' +
                    ' referencia, ' +
                    ' informacionContacto, ' +
                    ' cronico, ' +
                    ' idObraSocial, ' +
                    ' idUsuario, ' +
                    ' fechaAlta, ' +
                    ' fechaDefuncion, ' +
                    ' fechaUltimaActualizacion, ' +
                    ' idEstadoCivil, ' +
                    ' idEtnia, ' +
                    ' idPoblacion, ' +
                    ' idIdioma, ' +
                    ' otroBarrio, ' +
                    ' camino, ' +
                    ' campo, ' +
                    ' esUrbano, ' +
                    ' lote, ' +
                    ' parcela, ' +
                    ' edificio, ' +
                    ' activo, ' +
                    ' fechaAltaObraSocial, ' +
                    ' numeroAfiliado, ' +
                    ' numeroExtranjero, ' +
                    ' telefonoFijo, ' +
                    ' telefonoCelular, ' +
                    ' email, ' +
                    ' latitud, ' +
                    ' longitud, ' +
                    ' objectId ) ' +
                    ' VALUES( ' +
                    paciente.idEfector + ', ' +
                    '\'' + paciente.apellido + '\',' +
                    '\'' + paciente.nombre + '\', ' +
                    paciente.numeroDocumento + ', ' +
                    paciente.idSexo + ', ' +
                    '\'' + paciente.fechaNacimiento + '\',' +
                    paciente.idEstado + ', ' +
                    paciente.idMotivoNI + ', ' +
                    paciente.idPais + ', ' +
                    paciente.idProvincia + ', ' +
                    paciente.idNivelInstruccion + ', ' +
                    paciente.idSituacionLaboral + ', ' +
                    paciente.idProfesion + ', ' +
                    paciente.idOcupacion + ', ' +
                    '\'' + paciente.calle + '\', ' +
                    paciente.numero + ', ' +
                    '\'' + paciente.piso + '\', ' +
                    '\'' + paciente.departamento + '\', ' +
                    '\'' + paciente.manzana + '\', ' +
                    paciente.idBarrio + ', ' +
                    paciente.idLocalidad + ', ' +
                    paciente.idDepartamento + ', ' +
                    paciente.idProvinciaDomicilio + ', ' +
                    '\'' + paciente.referencia + '\', ' +
                    '\'' + paciente.informacionContacto + '\', ' +
                    paciente.cronico + ', ' +
                    paciente.idObraSocial + ', ' +
                    paciente.idUsuario + ', ' +
                    '\'' + paciente.fechaAlta + '\', ' +
                    '\'' + paciente.fechaDefuncion + '\', ' +
                    '\'' + paciente.fechaUltimaActualizacion + '\', ' +
                    paciente.idEstadoCivil + ', ' +
                    paciente.idEtnia + ', ' +
                    paciente.idPoblacion + ', ' +
                    paciente.idIdioma + ', ' +
                    '\'' + paciente.otroBarrio + '\', ' +
                    '\'' + paciente.camino + '\', ' +
                    '\'' + paciente.campo + '\', ' +
                    paciente.esUrbano + ', ' +
                    '\'' + paciente.lote + '\', ' +
                    '\'' + paciente.parcela + '\', ' +
                    '\'' + paciente.edificio + '\', ' +
                    paciente.activo + ', ' +
                    '\'' + paciente.fechaAltaObraSocial + '\', ' +
                    '\'' + paciente.numeroAfiliado + '\', ' +
                    '\'' + paciente.numeroExtranjero + '\', ' +
                    '\'' + paciente.telefonoFijo + '\', ' +
                    '\'' + paciente.telefonoCelular + '\', ' +
                    '\'' + paciente.email + '\', ' +
                    '\'' + paciente.latitud + '\', ' +
                    '\'' + paciente.longitud + '\', ' +
                    '\'' + paciente.objectId + '\' ' +
                    ') ';
                idPacienteGrabadoSips = await executeQuery(query);
            } else {
                idPacienteGrabadoSips = idPaciente;
            }

            resolve(idPacienteGrabadoSips);
        } catch (ex) {
            reject(ex);
        }
    });
}


function existepaciente(paciente) {
    let idpaciente;
    return new Promise((resolve: any, reject: any) => {
        (async  () => {
            try {

                let pool = await new sql.ConnectionPool(configSql).connect();

                let query = 'SELECT idPaciente FROM dbo.Sys_Paciente WHERE objectId = @objectId';
                let result = await new sql.Request(pool)
                    .input('objectId', sql.VarChar(50), paciente.objectId)
                    .query(query);
                if (typeof result[0] !== 'undefined') {
                    idpaciente = result[0].idPaciente;
                    resolve(idpaciente);
                } else {
                    idpaciente = 0;
                    resolve(idpaciente);
                }

            } catch (err) {
                reject(err);
            }
        })();
    });
}

async function executeQuery(query: any) {
    query += ' select SCOPE_IDENTITY() as id';
    let pool = await new sql.ConnectionPool(configSql).connect();

    return new Promise((resolve: any, reject: any) => {
        return new sql.Request(pool)
            .query(query)
            .then(result => {
                resolve(result.recordset[0].id);
            }).catch(err => {
                reject(err);
            });
    });
}

export async function cacheTurnos(unaAgenda) {
    // Armo el DTO para guardar en la cache de agendas
    // if ((unaAgenda.estado !== 'planificacion') && (unaAgenda.nominalizada) && (unaAgenda.tipoPrestaciones[0].term.includes('odonto')) || integraPrestacionesHPN(unaAgenda)) {
    let integrar;
    try {
        integrar = await integrarAgenda(unaAgenda);

    } catch (error) {
        return error;
    }

    if (unaAgenda.estado !== 'planificacion' && integrar) {
        let organizacionAgenda;
        if (unaAgenda.organizacion) {
            organizacionAgenda = await organizacionCompleto(unaAgenda.organizacion.id);
        }
        let profesionalesAgenda;
        if (unaAgenda.profesionales && unaAgenda.profesionales.length > 0) {
            profesionalesAgenda = await profesionalCompleto(unaAgenda.profesionales);
        }
        const agenda = new agendasCache({
            id: unaAgenda.id,
            tipoPrestaciones: unaAgenda.tipoPrestaciones,
            espacioFisico: unaAgenda.espacioFisico,
            organizacion: organizacionAgenda,
            profesionales: profesionalesAgenda,
            bloques: unaAgenda.bloques,
            estado: unaAgenda.estado,
            horaInicio: unaAgenda.horaInicio,
            horaFin: unaAgenda.horaFin,
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente,
        });

        agendasCache.find({
            id: agenda.id
        }, function getAgenda(err, data) {
            if (err) {
                return (err);
            }
            if (data.length > 0) {
                agendasCache.update({
                    id: agenda.id
                }, {
                    $set: {
                        tipoPrestaciones: unaAgenda.tipoPrestaciones,
                        espacioFisico: unaAgenda.espacioFisico,
                        organizacion: organizacionAgenda,
                        profesionales: profesionalesAgenda,
                        bloques: unaAgenda.bloques,
                        estado: unaAgenda.estado,
                        horaInicio: unaAgenda.horaInicio,
                        horaFin: unaAgenda.horaFin,
                        estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente,
                        sobreturnos: unaAgenda.sobreturnos

                    }
                }).exec();
            } else {
                agenda.save((err2, agendaGuardada: any) => {
                    if (err2) {
                        return err2;
                    }
                    return true;
                });
            }
        });
    } else {
        return true;
    }

    async function integrarAgenda(_agenda) {
        return new Promise((resolve, reject) => {
            configuracionPrestacionModel.find({
                'snomed.conceptId': { $eq: _agenda.tipoPrestaciones[0].conceptId },
                'organizaciones._id': { $eq: _agenda.organizacion._id }
            }).exec((err, data: any) => {
                if (err) {
                    reject(err);
                }
                if (data && data.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }
}

