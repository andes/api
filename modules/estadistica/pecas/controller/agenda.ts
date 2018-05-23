import { conSqlPecas } from './../../../../config.private';
import fs = require('fs');
import async = require('async');
import * as agendaModel from '../../../turnos/schemas/agenda';
import { toArray } from '../../../../utils/utils';
import { configuracionPrestacionModel as configPrestacion } from './../../../../core/term/schemas/configuracionPrestaciones';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { model as organizacion } from '../../../../core/tm/schemas/organizacion';
import * as cie10 from './../../../../core/term/schemas/cie10';
import * as sql from 'mssql';
import * as configPrivate from '../../../../config.private';

let poolTurnos;
let config = {
    user: configPrivate.conSqlPecas.auth.user,
    password: configPrivate.conSqlPecas.auth.password,
    server: configPrivate.conSqlPecas.serverSql.server,
    database: configPrivate.conSqlPecas.serverSql.database,
    connectionTimeout: 10000,
    requestTimeout: 45000
};

/**
 * Actualiza la tabla pecas_consolidado de la BD Andes
 *
 * @export consultaPecas()
 * @returns resultado
 */
export async function consultaPecas() {
    console.log('CONSULTA PECAS');
    try {
        poolTurnos = await new sql.ConnectionPool(config).connect();
    } catch (ex) {
        return (ex);
    }
    const query_limit = 10000000000;
    const type = 'PECAS-' + (new Date()).toISOString();
    const outputFile = './turnos-agendas-' + type + '.json';
    let match = {
        // 'organizacion._id': mongoose.Types.ObjectId('57fcf037326e73143fb48c3a'),
        'horaInicio': {
            $gt: new Date('2018-03-01T00:00:00.000-03:00')
        },
        'horaFin': {
            $lt: new Date('2018-04-20T00:00:00.000-03:00')
        },
        'bloques': {
            $ne: null
        },
        'bloques.turnos': {
            $ne: null
        },
        // 'estado': {
        //     $eq: 'auditada'
        // }
        '$or': [{
            estado: {
                $ne: 'suspendida'
            }
        }, {
            estado: {
                $ne: 'planificacion'
            }
        }, {
            estado: {
                $ne: 'pausada'
            }
        }],
    };
    try {
        let agendas = agendaModel.aggregate([
            { $match: match },
            { $limit: query_limit }
        ]).cursor({ async: true }).exec(
            async function (error, cursor) {
                if (error) {
                    console.log('todo mal');
                }
                agendas = await toArray(cursor);
                let indexAg = 0;

                agendas.forEach((a, indexA) => {
                    indexAg++;
                    // En cada agenda se recorren los bloques
                    async.every(a.bloques, (b, indexB) => {
                        let indexTU = 0;
                        let turno: any = {};
                        // RESTA REALIZAR LO MISMO PARA LOS SOBRETURNOS
                        async.every((b as any).turnos, async (t: any, indexT) => {
                            indexTU++;
                            if (t.estado === 'asignado' && t.paciente && t.asistencia && t.asistencia === 'asistio' && t.diagnostico.codificaciones
                                && t.diagnostico.codificaciones.length > 0 && t.diagnostico.codificaciones[0].codificacionAuditoria
                                && t.diagnostico.codificaciones[0].codificacionAuditoria.codigo) {
                                let efector = await getEfector(a.organizacion._id) as any;
                                let idEfector = efector.codigo;
                                let tipoEfector = efector.tipoEfector;
                                turno.idEfector = parseInt(idEfector, 10);
                                turno.Organizacion = a.organizacion.nombre;
                                turno.idTurno = String(t._id);
                                turno.FechaConsulta = moment(t.horaInicio).format('YYYYMMDD');
                                turno.HoraTurno = moment(t.horaInicio).format('HH:mm').toString();
                                turno.Periodo = parseInt(moment(t.horaInicio).format('YYYYMM').toString(), 10);
                                turno.DNI = Number(t.paciente.documento);
                                turno.Apellido = t.paciente.apellido;
                                turno.Nombres = t.paciente.nombre;
                                let carpetas = t.paciente.carpetaEfectores.filter(x => String(x.organizacion._id) === String(a.organizacion._id));
                                if (Array(carpetas).length > 0) {
                                    turno.HC = carpetas[0] ? (carpetas[0] as any).nroCarpeta : null;
                                } else {
                                    turno.HC = null;
                                }
                                turno.codSexo = String(t.paciente.sexo) === 'femenino' ? String(2) : String(1);
                                turno.Sexo = t.paciente.sexo;
                                turno.FechaNacimiento = (t.paciente.fechaNacimiento ? moment(t.paciente.fechaNacimiento).format('YYYYMMDD') : '-');
                                let objectoEdad = calcularEdad(t.paciente.fechaNacimiento);

                                turno.Edad = objectoEdad.valor;
                                turno.uniEdad = objectoEdad.unidad;
                                turno.CodRangoEdad = objectoEdad.CodRangoEdad;
                                turno.RangoEdad = objectoEdad.RangoEdad;
                                turno.Peso = null;
                                turno.Talla = null;
                                turno.TAS = null;
                                turno.TAD = null;
                                turno.IMC = null;
                                turno.RCVG = null;
                                let c2;
                                let primeraVez;
                                let principal;
                                let codifica;

                                // Diagnóstico 1
                                if (t.diagnostico && t.diagnostico.codificaciones
                                    && t.diagnostico.codificaciones.length > 0
                                    && t.diagnostico.codificaciones[0].codificacionAuditoria
                                    && t.diagnostico.codificaciones[0].codificacionAuditoria.codigo) {
                                    turno.Diag1Codigo = t.diagnostico.codificaciones[0].codificacionAuditoria.codigo;
                                    turno.Diag1Capitulo = await getCapitulo(turno.Diag1Codigo);
                                    turno.Desc1Diag = t.diagnostico.codificaciones[0].codificacionAuditoria.nombre;
                                    c2 = t.diagnostico.codificaciones[0].codificacionAuditoria.c2 ? 'SI' : 'NO';
                                    primeraVez = t.diagnostico.codificaciones[0].primeraVez ? 'Primera vez' : '';
                                    principal = 1;
                                    turno.Diag1Grupo = '';
                                    if (t.diagnostico.codificaciones[0].codificacionProfesional && t.diagnostico.codificaciones[0].codificacionProfesional.codigo) {
                                        codifica = 'PROFESIONAL';
                                    } else {
                                        codifica = 'NO PROFESIONAL';
                                    }

                                } else {
                                    turno.Diag1Codigo = null;
                                    turno.Diag1Capitulo = null;
                                    turno.Desc1Diag = null;
                                    turno.Diag1Grupo = null;
                                    c2 = null;
                                    primeraVez = null;
                                    principal = 0;
                                    codifica = null;
                                }

                                // Diagnóstico 2
                                if (t.diagnostico && t.diagnostico.codificaciones
                                    && t.diagnostico.codificaciones.length > 1
                                    && t.diagnostico.codificaciones[1].codificacionAuditoria
                                    && t.diagnostico.codificaciones[1].codificacionAuditoria.codigo) {
                                    turno.Diag2Codigo = t.diagnostico.codificaciones[1].codificacionAuditoria.codigo;
                                    turno.Diag2Capitulo = await getCapitulo(turno.Diag2Codigo);
                                    turno.Desc2Diag = t.diagnostico.codificaciones[1].codificacionAuditoria.nombre;
                                    turno.Diag2Grupo = '';
                                } else {
                                    turno.Diag2Codigo = null;
                                    turno.Diag2Capitulo = null;
                                    turno.Desc2Diag = null;
                                    turno.Diag2Grupo = null;
                                }

                                // Diagnóstico 3
                                if (t.diagnostico && t.diagnostico.codificaciones
                                    && t.diagnostico.codificaciones.length > 2
                                    && t.diagnostico.codificaciones[2].codificacionAuditoria
                                    && t.diagnostico.codificaciones[2].codificacionAuditoria.codigo) {
                                    turno.Diag3Codigo = t.diagnostico.codificaciones[2].codificacionAuditoria.codigo;
                                    turno.Diag3Capitulo = await getCapitulo(turno.Diag3Codigo);
                                    turno.Desc3Diag = t.diagnostico.codificaciones[2].codificacionAuditoria.nombre;
                                    turno.Diag3Grupo = '';
                                } else {
                                    turno.Diag3Codigo = null;
                                    turno.Diag3Capitulo = null;
                                    turno.Desc3Diag = null;
                                    turno.Diag3Grupo = null;
                                }
                                turno.Profesional = (a.profesionales && a.profesionales[0] && a.profesionales.length > 0 ? a.profesionales.map(pr => pr.apellido + ', ' + pr.nombre).join('; ') : 'Sin profesionales');
                                turno.TipoProfesional = null;
                                turno.CodigoEspecialidad = null;
                                turno.Especialidad = null;
                                turno.CodigoServicio = null;
                                turno.Servicio = (a.espacioFisico && a.espacioFisico.servicio ? a.espacioFisico.servicio.nombre : 'Sin servicio');
                                turno.IdBarrio = null;
                                turno.Barrio = null;
                                turno.IdLocalidad = null;
                                turno.Localidad = null;
                                turno.IdDpto = null;
                                turno.Departamento = null;
                                turno.IdPcia = null;
                                turno.Provincia = null;
                                turno.IdNacionalidad = null;
                                turno.Nacionalidad = null;
                                turno.Calle = null;
                                turno.Altura = null;
                                turno.Piso = null;
                                turno.Depto = null;
                                turno.Manzana = null;
                                turno.ConsC2 = c2;
                                turno.ConsObst = null;
                                turno.Tipodeconsulta = primeraVez;
                                turno.Principal = principal;
                                turno.TipoConsultorio = null;
                                turno.IdObraSocial = (t.paciente.obraSocial && t.paciente.obraSocial.codigo) ? t.paciente.obraSocial.codigo : null;
                                turno.ObraSocial = (t.paciente.obraSocial && t.paciente.obraSocial.nombre) ? t.paciente.obraSocial.nombre : null;
                                if (tipoEfector && tipoEfector === 'Centro de Salud') {
                                    turno.TipoEfector = '1';
                                }
                                if (tipoEfector && tipoEfector === 'Hospital') {
                                    turno.TipoEfector = '2';
                                }
                                turno.DescTipoEfector = tipoEfector;
                                turno.IdZona = null;
                                turno.Zona = null;
                                turno.SubZona = null;
                                turno.idEfectorSuperior = null;
                                turno.EfectorSuperior = null;
                                turno.AreaPrograma = null;

                                turno.IdPaciente = String(t.paciente.id);
                                turno.Longitud = '';
                                turno.Latitud = '';
                                turno.Cantidad = 1;
                                turno.idproceso = 0;
                                turno.codifica = codifica;
                                turno.telefono = t.paciente && t.paciente.telefono ? t.paciente.telefono : '';
                                try {
                                    let jsonWrite = fs.appendFileSync(outputFile, JSON.stringify(turno) + ',', {
                                        encoding: 'utf8'
                                    });
                                    let query = 'INSERT INTO dbo.Pecas_consolidado ( idEfector, Efector, idTurno, FechaConsulta, HoraTurno, Periodo, DNI, Apellido, Nombres, HC, CodSexo, Sexo) ' +
                                        'VALUES  ( ' + turno.idEfector + ',\'' + turno.Organizacion + '\',\'' + turno.idTurno + '\',\'' + turno.FechaConsulta + '\',\'' + turno.HoraTurno +
                                        '\',' + turno.Periodo + ',' + turno.DNI + ',\'' + turno.Apellido + '\',\'' + turno.Nombres + '\',\'' + turno.HC + '\',\'' + turno.codSexo +
                                        '\',\'' + turno.Sexo + '\' ) ';
                                    console.log('query ', query);
                                    await executeQuery(query);
                                } catch (error) {
                                    return (error);
                                }
                            }
                        });
                    });
                });
            });
    } catch (error) {
        console.log('error', error);
    }
}

function getEspecialidad(conceptId, idOrganizacion: string) {
    return new Promise((resolve, reject) => {
        var especialidad = '';
        configPrestacion.find({
            'tipoPrestacion.conceptId': conceptId,
            'organizacionesSips._id': mongoose.Types.ObjectId(idOrganizacion)
        }).exec().then(configuraciones => {
            if (configuraciones.length > 0) {
                let organizacionesSips = configuraciones[0]['organizacionesSips'];
                if (organizacionesSips && organizacionesSips.length > 0) {
                    var datos = organizacionesSips.filter((elem) => String(elem._id) === String(idOrganizacion));
                    if (datos && datos.length > 0) {
                        especialidad = datos[0].nombreEspecialidad;
                    }
                }
            }
            resolve(especialidad);
        });
    });
}

function getEfector(idOrganizacion: any) {
    return new Promise((resolve, reject) => {
        organizacion.findOne({
            '_id': mongoose.Types.ObjectId(idOrganizacion)
        }).exec(function (err, data) {
            if (err) {
                reject(err);
            }
            if ((data as any).codigo) {
                let codigoSips = (data as any).codigo as any;
                let efector = {
                    codigo: codigoSips.sips,
                    tipoEfector: (data as any).tipoEstablecimiento.nombre
                };
                if (codigoSips) {
                    resolve(efector);
                } else {
                    resolve('');
                }
            } else {
                resolve('');
            }
        });
    });
}

function getCapitulo(codigoCIE10: string) {
    return new Promise((resolve, reject) => {
        cie10.model.findOne({
            'codigo': String(codigoCIE10)
        }).exec(function (err, data) {
            if (err) {
                reject(err);
            }
            if (data) {
                let capitulo = String((data as any).capitulo);
                resolve(capitulo);
            } else {
                resolve('');
            }
        });
    });
}

function calcularEdad(fechaNacimiento) {
    let edad: any;
    let fechaActual: Date = new Date();
    let fechaAct = moment(fechaActual, 'YYYY-MM-DD HH:mm:ss');
    let difDias = fechaAct.diff(fechaNacimiento, 'd'); // Diferencia en días
    let difAnios = Math.floor(difDias / 365.25);
    let difMeses = Math.floor(difDias / 30.4375);

    if (difAnios !== 0) {
        edad = {
            valor: difAnios,
            unidad: 'A'
        };
        if (difAnios <= 4) {
            edad['CodRangoEdad'] = '2';
            edad['RangoEdad'] = '[1 a 4]';
        } else if (difAnios >= 5 && difAnios <= 14) {
            edad['CodRangoEdad'] = '3';
            edad['RangoEdad'] = '[5 a 14]';
        } else if (difAnios >= 15 && difAnios <= 19) {
            edad['CodRangoEdad'] = '4';
            edad['RangoEdad'] = '[15 a 19]';
        } else if (difAnios >= 20 && difAnios <= 39) {
            edad['CodRangoEdad'] = '5';
            edad['RangoEdad'] = '[20 a 39]';
        } else if (difAnios >= 40 && difAnios <= 69) {
            edad['CodRangoEdad'] = '6';
            edad['RangoEdad'] = '[40 a 69]';
        } else if (difAnios >= 70) {
            edad['CodRangoEdad'] = '7';
            edad['RangoEdad'] = '[70 y +]';
        }
    } else if (difMeses !== 0) {
        edad = {
            valor: difMeses,
            unidad: 'M',
            CodRangoEdad: '1',
            RangoEdad: '[1]'
        };
    } else if (difDias !== 0) {
        edad = {
            valor: difDias,
            unidad: 'D',
            CodRangoEdad: '1',
            RangoEdad: '[1]'
        };
    }
    return edad;
    // return (String(edad.valor) + ' ' + edad.unidad);
}

async function executeQuery(query: any) {
    try {
        query += ' select SCOPE_IDENTITY() as id';
        let result = await new sql.Request(poolTurnos).query(query);
        if (result && result.recordset) {
            return result.recordset[0].id;
        }
    } catch (err) {
        return (err);
    }
}
