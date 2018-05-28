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
            $gt: new Date('2018-02-15T00:00:00.000-03:00')
        },
        'horaFin': {
            $lt: new Date('2018-02-15T23:00:00.000-03:00')
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
                agendas.forEach((a, indexA) => {
                    // En cada agenda se recorren los bloques
                    async.every(a.bloques, (b, indexB) => {
                        // RESTA REALIZAR LO MISMO PARA LOS SOBRETURNOS
                        async.every((b as any).turnos, async (t: any, indexT) => {
                            auxiliar(a, t);
                        });
                    });
                    async.every((a as any).sobreturnos, async (t: any, indexT) => {
                        auxiliar(a, t);
                    });
                });
            });
    } catch (error) {
        console.log('error', error);
    }
}

async function auxiliar(a: any, t: any) {
    let turno: any = {};
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

        // Diagnóstico 1
        if (t.diagnostico && t.diagnostico.codificaciones
            && t.diagnostico.codificaciones.length > 0
            && t.diagnostico.codificaciones[0].codificacionAuditoria
            && t.diagnostico.codificaciones[0].codificacionAuditoria.codigo) {
            turno.Diag1Codigo = t.diagnostico.codificaciones[0].codificacionAuditoria.codigo;
            turno.Diag1Capitulo = await getCapitulo(turno.Diag1Codigo);
            turno.Desc1Diag = t.diagnostico.codificaciones[0].codificacionAuditoria.nombre;
            turno.ConsC2 = t.diagnostico.codificaciones[0].codificacionAuditoria.c2 ? 'SI' : 'NO';
            turno.Tipodeconsulta = t.diagnostico.codificaciones[0].primeraVez ? 'Primera vez' : 'Ulterior';
            turno.Principal = 1;
            turno.Diag1Grupo = '';
            if (t.diagnostico.codificaciones[0].codificacionProfesional && t.diagnostico.codificaciones[0].codificacionProfesional.codigo) {
                turno.codifica = 'PROFESIONAL';
            } else {
                turno.codifica = 'NO PROFESIONAL';
            }

        } else {
            turno.Diag1Codigo = null;
            turno.Diag1Capitulo = null;
            turno.Desc1Diag = null;
            turno.Diag1Grupo = null;
            turno.ConsC2 = null;
            turno.Tipodeconsulta = null;
            turno.Principal = 0;
            turno.codifica = null;
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
            turno.Diag3Capitulo = await getCapitulo(turno.Diag2Codigo);
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
        turno.ConsObst = t.tipoPrestacion.term.includes('obstetricia') ? 'SI' : 'NO';
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
        // turno.codifica = codifica;
        turno.telefono = t.paciente && t.paciente.telefono ? t.paciente.telefono : '';
        try {
            let query = 'INSERT INTO dbo.Pecas_consolidado ( idEfector, Efector, idTurno, FechaConsulta, HoraTurno, Periodo, DNI, Apellido, Nombres, HC, CodSexo, Sexo, ' +
                'FechaNacimiento, Edad, UniEdad, CodRangoEdad, RangoEdad, Peso, Talla, TAS, TAD, IMC, RCVG, Diag1Codigo, Diag1Capitulo, Desc1Diag, Diag1Grupo, Diag2Codigo, ' +
                'Diag2Capitulo, Desc2Diag, Diag2Grupo, Diag3Codigo, Diag3Capitulo, Desc3Diag, Diag3Grupo, Profesional, TipoProfesional, CodigoEspecialidad, Especialidad, ' +
                'CodigoServicio, Servicio, IdBarrio, Barrio, IdLocalidad, Localidad, IdDpto, Departamento, IdPcia, Provincia, IdNacionalidad, Nacionalidad, Calle, Altura, ' +
                'Piso, Depto, Manzana, ConsC2, ConsObst, Tipodeconsulta, Principal, TipoConsultorio, IdObraSocial, ObraSocial, TipoEfector, DescTipoEfector, IdZona, Zona, ' +
                'SubZona, idEfectorSuperior, EfectorSuperior, AreaPrograma, IdPaciente, Longitud, Latitud, Cantidad, idproceso, codifica, telefono) ' +
                'VALUES  ( ' + turno.idEfector + ',\'' + turno.Organizacion + '\',\'' + turno.idTurno + '\',\'' + turno.FechaConsulta + '\',\'' + turno.HoraTurno +
                '\',' + turno.Periodo + ',' + turno.DNI + ',\'' + turno.Apellido + '\',\'' + turno.Nombres + '\',\'' + turno.HC + '\',\'' + turno.codSexo +
                '\',\'' + turno.Sexo + '\',\'' + turno.FechaNacimiento + '\',' + turno.Edad + ',\'' + turno.uniEdad + '\',\'' + turno.CodRangoEdad +
                '\',\'' + turno.RangoEdad + '\' ,' + turno.Peso + ',' + turno.Talla + ',\'' + turno.TAS + '\',\'' + turno.TAD + '\',\'' + turno.IMC +
                '\',\'' + turno.RCVG + '\',\'' + turno.Diag1Codigo + '\',\'' + turno.Diag1Capitulo + '\',\'' + turno.Desc1Diag + '\',\'' + turno.Diag1Grupo +
                '\',\'' + turno.Diag2Codigo + '\',\'' + turno.Diag2Capitulo + '\',\'' + turno.Desc2Diag + '\',\'' + turno.Diag2Grupo +
                '\',\'' + turno.Diag3Codigo + '\',\'' + turno.Diag3Capitulo + '\',\'' + turno.Desc3Diag + '\',\'' + turno.Diag3Grupo +
                '\',\'' + turno.Profesional + '\',\'' + turno.TipoProfesional + '\',' + turno.CodigoEspecialidad + ',\'' + turno.Especialidad +
                '\',' + turno.CodigoServicio + ',\'' + turno.Servicio + '\',' + turno.IdBarrio + ',\'' + turno.Barrio + '\',' + turno.IdLocalidad +
                ',\'' + turno.Localidad + '\',' + turno.IdDpto + ',\'' + turno.Departamento + '\',' + turno.IdPcia + ',\'' + turno.Provincia +
                '\',' + turno.IdNacionalidad + ',\'' + turno.Nacionalidad + '\',\'' + turno.Calle + '\',\'' + turno.Altura + '\',\'' + turno.Piso +
                '\',\'' + turno.Depto + '\',\'' + turno.Manzana + '\',\'' + turno.ConsC2 + '\',\'' + turno.ConsObst + '\',\'' + turno.Tipodeconsulta +
                '\',\'' + turno.Principal + '\',\'' + turno.TipoConsultorio + '\',' + turno.IdObraSocial + ',\'' + turno.ObraSocial + '\',\'' + turno.TipoEfector +
                '\',\'' + turno.DescTipoEfector + '\',' + turno.IdZona + ',\'' + turno.Zona + '\',\'' + turno.SubZona + '\',' + turno.idEfectorSuperior +
                ',\'' + turno.EfectorSuperior + '\',\'' + turno.AreaPrograma + '\',\'' + turno.IdPaciente + '\',\'' + turno.Longitud + '\',\'' + turno.Latitud +
                '\',' + turno.Cantidad + ',' + turno.idproceso + ',\'' + turno.codifica + '\',\'' + turno.telefono + '\') ';
            console.log('query ', query);
            await executeQuery(query);
        } catch (error) {
            return (error);
        }
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
