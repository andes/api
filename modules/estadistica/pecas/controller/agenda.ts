import fs = require('fs');
import async = require('async');
import * as agendaModel from '../../../turnos/schemas/agenda';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { model as organizacion } from '../../../../core/tm/schemas/organizacion';
import * as sql from 'mssql';
import * as configPrivate from '../../../../config.private';
import { Logger } from '../../../../utils/logService';
import { userScheduler } from '../../../../config.private';

let poolTurnos;
const config = {
    user: configPrivate.conSqlPecas.auth.user,
    password: configPrivate.conSqlPecas.auth.password,
    server: configPrivate.conSqlPecas.serverSql.server,
    database: configPrivate.conSqlPecas.serverSql.database,
    connectionTimeout: 10000,
    requestTimeout: 45000
};
const type = 'PECAS-' + (new Date()).toISOString();
const outputFile = type + '.json';

/**
 * Actualiza la tabla pecas_consolidado de la BD Andes
 *
 * @export consultaPecas()
 * @returns resultado
 */
export async function consultaPecas(start, end, done) {
    try {
        poolTurnos = await new sql.ConnectionPool(config).connect();
    } catch (ex) {
        // console.log('ex', ex);
        return (ex);
    }

    let orgExcluidas = organizacionesExcluidas();

    let match = {
        $and: [
            { $or: orgExcluidas },
            { updatedAt: { $gt: new Date(start) } },
            { updatedAt: { $lt: new Date(end) } }
        ],
        bloques: {
            $ne: null
        },
        'bloques.turnos': {
            $ne: null
        },
        $or: [
            {
                estado: {
                    $ne: 'planificacion'
                }
            },
            {
                estado: {
                    $ne: 'pausada'
                }
            },
            {
                estado: {
                    $ne: 'borrada'
                }
            }],
    };
    try {
        const agendas = agendaModel.aggregate([
         { $match: match },
        ]).cursor({ batchSize: 100 }).exec();
        await agendas.eachAsync(async (a, error) => {
            if (error) {
                // console.log('error ', error);
                return (error);
            }
            const promises = [];
            // Se recorren los turnos dentro de los bloques
            a.bloques.forEach(b => {
                b.turnos.forEach(t => {
                    const p = auxiliar(a, b, t);
                    promises.push(p);
                });
            });
            // Se recorren los sobreturnos
            a.sobreturnos.forEach(t => {
                const p = auxiliar(a, null, t);
                promises.push(p);
            });
            return await Promise.all(promises);
        });
        done();
    } catch (error) {
        return (done(error));
    }
}

// castea cada turno asignado y lo inserta en la tabla Sql
async function auxiliar(a: any, b: any, t: any) {
    let turno: any = {};
    turno.sobreturno = (b !== null) ? 'NO' : 'SI';
    // console.log('b => ', b);
    try {
        // Chequear si el turno existe en sql PECAS y depeniendo de eso hacer un insert o  un update
        turno.tipoTurno = t.tipoTurno ? (t.tipoTurno === 'profesional' ? 'autocitado' : (t.tipoTurno === 'gestion' ? 'conllave' : t.tipoTurno)) : 'Sin datos';
        turno.estadoTurno = t.estado;
        let turnoConPaciente = t.estado === 'asignado' && t.paciente; // && t.asistencia
        let efector = await getEfector(a.organizacion._id) as any;
        let idEfector = efector ? efector.codigo : null;
        let tipoEfector = efector ? efector.tipoEfector : null;
        turno.tipoPrestacion = (turnoConPaciente && t.tipoPrestacion && t.tipoPrestacion.term) ? t.tipoPrestacion.term : null;
        turno.idEfector = parseInt(idEfector, 10);
        turno.Organizacion = a.organizacion.nombre;
        turno.idAgenda = a._id;
        turno.FechaAgenda = moment(a.horaInicio).format('YYYYMMDD');
        turno.HoraAgenda = moment(a.horaInicio).format('HH:mm').toString();
        turno.estadoAgenda = a.estado;
        turno.numeroBloque = a.bloques.indexOf(b);
        turno.accesoDirectoProgramado = (b && b.accesoDirectoProgramado) ? b.accesoDirectoProgramado : null;
        turno.reservadoProfesional = (b && b.reservadoProfesional) ? b.reservadoProfesional : null;
        turno.reservadoGestion = (b && b.reservadoGestion) ? b.reservadoGestion : null;
        turno.accesoDirectoDelDia = (b && b.accesoDirectoDelDia) ? b.accesoDirectoDelDia : null;
        turno.idTurno = String(t._id);
        turno.FechaConsulta = moment(t.horaInicio).format('YYYYMMDD');
        turno.HoraTurno = moment(t.horaInicio).format('HH:mm').toString();
        turno.Periodo = parseInt(moment(t.horaInicio).format('YYYYMM').toString(), 10);
        turno.DNI = turnoConPaciente ? Number(t.paciente.documento) : null;
        turno.Apellido = turnoConPaciente ? t.paciente.apellido : null;
        turno.Apellido = turnoConPaciente ? turno.Apellido.toString().replace('\'', '\'\'') : null;
        turno.Nombres = turnoConPaciente ? t.paciente.nombre : null;
        const carpetas = turnoConPaciente ? t.paciente.carpetaEfectores.filter(x => String(x.organizacion._id) === String(a.organizacion._id)) : [];
        if (Array(carpetas).length > 0) {
            turno.HC = carpetas[0] ? (carpetas[0] as any).nroCarpeta : null;
        } else {
            turno.HC = null;
        }
        turno.codSexo = turnoConPaciente ? String(t.paciente.sexo) === 'femenino' ? String(2) : String(1) : null;
        turno.Sexo = turnoConPaciente ? t.paciente.sexo : null;
        turno.FechaNacimiento = (turnoConPaciente && t.paciente.fechaNacimiento ? moment(t.paciente.fechaNacimiento).format('YYYYMMDD') : '');
        const objectoEdad = (t.paciente && turno.FechaNacimiento) ? calcularEdad(t.paciente.fechaNacimiento) : null;

        turno.Edad = t.paciente && turno.fechaNacimiento ? objectoEdad.valor : null;
        turno.uniEdad = t.paciente && turno.fechaNacimiento ? objectoEdad.unidad : null;
        turno.CodRangoEdad = t.paciente && turno.fechaNacimiento ? objectoEdad.CodRangoEdad : null;
        turno.RangoEdad = t.paciente && turno.fechaNacimiento ? objectoEdad.RangoEdad : null;
        turno.Peso = null;
        turno.Talla = null;
        turno.TAS = null;
        turno.TAD = null;
        turno.IMC = null;
        turno.RCVG = null;
        turno.codifica = null;
        turno.Diag1CodigoOriginal = null;
        turno.Desc1DiagOriginal = null;
        turno.Diag1CodigoAuditado = null;
        turno.Desc1DiagAuditado = null;
        turno.conceptId1 = null;
        turno.semanticTag1 = null;

        turno.term1 = null;
        turno.Principal = 0;
        turno.Tipodeconsulta = null;
        turno.ConsC2 = null;

        // Estado turno
        let estadoAuditoria = null;
        if (t) {
            // console.log(t.estado);
            switch (t.estado) {
                case 'disponible':
                    estadoAuditoria = 'Disponible';
                    break;
                case 'suspendido':
                    estadoAuditoria = 'Suspendido';
                    break;
                case 'asignado':
                    if (t.asistencia) {
                        estadoAuditoria = 'Asistencia Verificada';
                    }
                    if (t.diagnostico.codificaciones.length > 0) {
                        if (!(t.diagnostico.codificaciones[0].codificacionAuditoria && t.diagnostico.codificaciones[0].codificacionAuditoria.codigo) && (t.diagnostico.codificaciones[0].codificacionProfesional)) {
                            estadoAuditoria = 'Registrado por Profesional';
                        }
                        if ((t.asistencia === 'noAsistio' || t.asistencia === 'sinDatos' || (t.diagnostico.codificaciones[0].codificacionAuditoria && t.diagnostico.codificaciones[0].codificacionAuditoria.codigo))) {
                            estadoAuditoria = 'Auditado';
                        }
                    }
                    break;
                default:
                    estadoAuditoria = null;
            }

        }

        turno.estadoTurnoAuditoria = estadoAuditoria;


        // Asistencia
        turno.asistencia = turnoConPaciente && t.asistencia ? t.asistencia : null;
        turno.reasignado = turnoConPaciente && t.reasignado && t.reasignado.siguiente ? 'SI' : 'NO';
        // Diagnóstico 1 ORIGINAL
        if (t.diagnostico.codificaciones.length > 0 && t.diagnostico.codificaciones[0] && t.diagnostico.codificaciones[0].primeraVez !== undefined) {
            turno.primeraVez1 = (t.diagnostico.codificaciones[0].primeraVez === true) ? 1 : 0;
        } else {
            turno.primeraVez1 = null;
        }
        if (t.diagnostico.codificaciones.length > 0 && t.diagnostico.codificaciones[0].codificacionProfesional) {
            turno.codifica = 'PROFESIONAL';
            if (t.diagnostico.codificaciones[0].codificacionProfesional.cie10 && t.diagnostico.codificaciones[0].codificacionProfesional.cie10.codigo) {
                turno.Diag1CodigoOriginal = t.diagnostico.codificaciones[0].codificacionProfesional.cie10.codigo;
                turno.Desc1DiagOriginal = t.diagnostico.codificaciones[0].codificacionProfesional.cie10.nombre;
            }
            if (t.diagnostico.codificaciones[0].codificacionProfesional.snomed && t.diagnostico.codificaciones[0].codificacionProfesional.snomed.conceptId) {
                turno.conceptId1 = t.diagnostico.codificaciones[0].codificacionProfesional.snomed.conceptId;
                turno.term1 = t.diagnostico.codificaciones[0].codificacionProfesional.snomed.term;
                turno.semanticTag1 = t.diagnostico.codificaciones[0].codificacionProfesional.snomed.semanticTag;
            }
        } else {
            turno.codifica = 'NO PROFESIONAL';
        }
        // Diagnóstico 1 AUDITADO
        if (t.diagnostico.codificaciones.length > 0 && t.diagnostico.codificaciones[0].codificacionAuditoria && t.diagnostico.codificaciones[0].codificacionAuditoria.codigo) {
            turno.Diag1CodigoAuditado = t.diagnostico.codificaciones[0].codificacionAuditoria.codigo;
            turno.Desc1DiagAuditado = t.diagnostico.codificaciones[0].codificacionAuditoria.nombre;
            turno.ConsC2 = t.diagnostico.codificaciones[0].codificacionAuditoria.c2 && t.diagnostico.codificaciones[0].primeraVez ? 'SI' : 'NO';
            turno.Tipodeconsulta = t.diagnostico.codificaciones[0].primeraVez ? 'Primera vez' : 'Ulterior';
            turno.Principal = 1;
        }

        // Diagnóstico 2 ORIGINAL
        turno.Diag2CodigoOriginal = null;
        turno.Desc2DiagOriginal = null;
        turno.Diag2CodigoAuditado = null;
        turno.Desc2DiagAuditado = null;
        turno.conceptId2 = null;
        turno.term2 = null;
        turno.semanticTag2 = null;
        if (t.diagnostico.codificaciones.length > 1 && t.diagnostico.codificaciones[1] && t.diagnostico.codificaciones[1].primeraVez !== undefined) {
            turno.primeraVez2 = (t.diagnostico.codificaciones[1].primeraVez === true) ? 1 : 0;
        } else {
            turno.primeraVez2 = null;
        }
        if (t.diagnostico.codificaciones.length > 1 && t.diagnostico.codificaciones[1].codificacionProfesional) {
            if (t.diagnostico.codificaciones[1].codificacionProfesional.cie10 && t.diagnostico.codificaciones[1].codificacionProfesional.cie10.codigo) {
                turno.Diag2CodigoOriginal = t.diagnostico.codificaciones[1].codificacionProfesional.cie10.codigo;
                turno.Desc2DiagOriginal = t.diagnostico.codificaciones[1].codificacionProfesional.cie10.nombre;
            }
            if (t.diagnostico.codificaciones[1].codificacionProfesional.snomed && t.diagnostico.codificaciones[1].codificacionProfesional.snomed.conceptId) {
                turno.conceptId2 = t.diagnostico.codificaciones[1].codificacionProfesional.snomed.conceptId;
                turno.term2 = t.diagnostico.codificaciones[1].codificacionProfesional.snomed.term;
                turno.semanticTag2 = t.diagnostico.codificaciones[1].codificacionProfesional.snomed.semanticTag;
            }
        }
        // Diagnóstico 2 AUDITADO
        if (t.diagnostico.codificaciones.length > 1 && t.diagnostico.codificaciones[1].codificacionAuditoria && t.diagnostico.codificaciones[1].codificacionAuditoria.codigo) {
            turno.Diag2CodigoAuditado = t.diagnostico.codificaciones[1].codificacionAuditoria.codigo;
            turno.Desc2DiagAuditado = t.diagnostico.codificaciones[1].codificacionAuditoria.nombre;
        }
        // Diagnóstico 3 ORIGINAL
        turno.Diag3CodigoOriginal = null;
        turno.Desc3DiagOriginal = null;
        turno.Diag3CodigoAuditado = null;
        turno.Desc3DiagAuditado = null;
        turno.conceptId3 = null;
        turno.term3 = null;
        turno.semanticTag3 = null;

        if (t.diagnostico.codificaciones.length > 2 && t.diagnostico.codificaciones[2] && t.diagnostico.codificaciones[2].primeraVez !== undefined) {
            turno.primeraVez3 = (t.diagnostico.codificaciones[2].primeraVez === true) ? 1 : 0;
        } else {
            turno.primeraVez3 = null;
        }
        if (t.diagnostico.codificaciones.length > 2 && t.diagnostico.codificaciones[2].codificacionProfesional) {
            if (t.diagnostico.codificaciones[2].codificacionProfesional.cie10 && t.diagnostico.codificaciones[2].codificacionProfesional.cie10.codigo) {
                turno.Diag3CodigoOriginal = t.diagnostico.codificaciones[2].codificacionProfesional.cie10.codigo;
                turno.Desc3DiagOriginal = t.diagnostico.codificaciones[2].codificacionProfesional.cie10.nombre;
            }
            if (t.diagnostico.codificaciones[2].codificacionProfesional.snomed && t.diagnostico.codificaciones[2].codificacionProfesional.snomed.conceptId) {
                turno.conceptId3 = t.diagnostico.codificaciones[2].codificacionProfesional.snomed.conceptId;
                turno.term3 = t.diagnostico.codificaciones[2].codificacionProfesional.snomed.term;
                turno.semanticTag3 = t.diagnostico.codificaciones[2].codificacionProfesional.snomed.semanticTag;
            }
        }
        // Diagnóstico 3 AUDITADO
        if (t.diagnostico.codificaciones.length > 2 && t.diagnostico.codificaciones[2].codificacionAuditoria && t.diagnostico.codificaciones[2].codificacionAuditoria.codigo) {
            turno.Diag3CodigoAuditado = t.diagnostico.codificaciones[2].codificacionAuditoria.codigo;
            turno.Desc3DiagAuditado = t.diagnostico.codificaciones[2].codificacionAuditoria.nombre;
        }

        turno.Profesional = (a.profesionales && a.profesionales[0] && a.profesionales.length > 0 ? a.profesionales.map(pr => String(pr.apellido) + ', ' + String(pr.nombre)).join('; ') : 'Sin profesionales');
        turno.Profesional = turno.Profesional.toString().replace('\'', '\'\'');
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
        turno.ConsObst = t.tipoPrestacion && t.tipoPrestacion.term.includes('obstetricia') ? 'SI' : 'NO';
        turno.IdObraSocial = (turnoConPaciente && t.paciente.obraSocial && t.paciente.obraSocial.codigo) ? t.paciente.obraSocial.codigo : null;
        turno.ObraSocial = (turnoConPaciente && t.paciente.obraSocial && t.paciente.obraSocial.financiador) ? t.paciente.obraSocial.financiador.toString().replace('\'', '\'\'') : null;
        if (tipoEfector && tipoEfector === 'Centro de Salud') {
            turno.TipoEfector = '1';
        }
        if (tipoEfector && tipoEfector === 'Hospital') {
            turno.TipoEfector = '2';
        }
        if (tipoEfector && tipoEfector === 'Puesto Sanitario') {
            turno.TipoEfector = '3';
        }
        if (tipoEfector && tipoEfector === 'ONG') {
            turno.TipoEfector = '6';
        }
        turno.DescTipoEfector = tipoEfector;
        turno.IdZona = null;
        turno.Zona = null;
        turno.SubZona = null;
        turno.idEfectorSuperior = null;
        turno.EfectorSuperior = null;
        turno.AreaPrograma = null;

        turno.IdPaciente = (t.paciente) ? String(t.paciente.id) : null;
        turno.Longitud = '';
        turno.Latitud = '';
        turno.telefono = t.paciente && t.paciente.telefono ? t.paciente.telefono : '';
        turno.estadoAgenda = a.estado;
        turno.turnosMobile = 0;
        if (t.emitidoPor && (t.emitidoPor === 'appMobile')) {
            turno.turnosMobile = 1;
        }

        // se verifica si existe el turno en sql
        let queryInsert = 'INSERT INTO dbo.Pecas_consolidado_2' +
            '(idEfector, Efector, TipoEfector, DescTipoEfector, IdZona, Zona, SubZona, idEfectorSuperior, EfectorSuperior, AreaPrograma, ' +
            'idAgenda, FechaAgenda, HoraAgenda, estadoAgenda, numeroBloque, turnosProgramados, turnosProfesional, turnosLlaves, turnosDelDia, ' +
            'idTurno, estadoTurno, tipoTurno, sobreturno, FechaConsulta, HoraTurno, Periodo, Tipodeconsulta, estadoTurnoAuditoria, Principal, ConsC2, ConsObst, tipoPrestacion, ' +
            'DNI, Apellido, Nombres, HC, CodSexo, Sexo, FechaNacimiento, Edad, UniEdad, CodRangoEdad, RangoEdad, IdObraSocial, ObraSocial, IdPaciente, telefono, ' +
            'IdBarrio, Barrio, IdLocalidad, Localidad, IdDpto, Departamento, IdPcia, Provincia, IdNacionalidad, Nacionalidad, ' +
            'Calle, Altura, Piso, Depto, Manzana, Longitud, Latitud, ' +
            'Peso, Talla, TAS, TAD, IMC, RCVG, asistencia, reasignado, ' +
            'Diag1CodigoOriginal, Desc1DiagOriginal, Diag1CodigoAuditado, Desc1DiagAuditado, SemanticTag1, SnomedConcept1, SnomedTerm1, primeraVez1, ' +
            'Diag2CodigoOriginal, Desc2DiagOriginal, Diag2CodigoAuditado, Desc2DiagAuditado, SemanticTag2, SnomedConcept2, SnomedTerm2, primeraVez2, ' +
            'Diag3CodigoOriginal, Desc3DiagOriginal, Diag3CodigoAuditado, Desc3DiagAuditado, SemanticTag3, SnomedConcept3, SnomedTerm3, primeraVez3, ' +
            'Profesional, TipoProfesional, CodigoEspecialidad, Especialidad, CodigoServicio, Servicio, ' +
            'codifica, turnosMobile) ' +
            'VALUES  ( ' + turno.idEfector + ',\'' + turno.Organizacion + '\',\'' + turno.TipoEfector + '\',\'' + turno.DescTipoEfector +
            '\',' + turno.IdZona + ',\'' + turno.Zona + '\',\'' + turno.SubZona + '\',' + turno.idEfectorSuperior + ',\'' + turno.EfectorSuperior + '\',\'' + turno.AreaPrograma +
            '\',\'' + turno.idAgenda + '\',\'' + turno.FechaAgenda + '\',\'' + turno.HoraAgenda + '\',\'' + turno.estadoAgenda +
            '\',' + turno.numeroBloque + ',' + turno.accesoDirectoProgramado + ',' + turno.reservadoProfesional + ',' + turno.reservadoGestion + ',' + turno.accesoDirectoDelDia +
            ',\'' + turno.idTurno + '\',\'' + turno.estadoTurno + '\',\'' + turno.tipoTurno + '\',\'' + turno.sobreturno + '\',\'' + turno.FechaConsulta + '\',\'' + turno.HoraTurno + '\',' + turno.Periodo + ',\'' + turno.Tipodeconsulta + '\',\'' + turno.estadoTurnoAuditoria + '\',\'' + turno.Principal +
            '\',\'' + turno.ConsC2 + '\',\'' + turno.ConsObst + '\',\'' + turno.tipoPrestacion +
            // DATOS PACIENTE
            '\',' + turno.DNI + ',\'' + turno.Apellido + '\',\'' + turno.Nombres + '\',\'' + turno.HC + '\',\'' + turno.codSexo +
            '\',\'' + turno.Sexo + '\',\'' + turno.FechaNacimiento + '\',' + turno.Edad + ',\'' + turno.uniEdad + '\',\'' + turno.CodRangoEdad +
            '\',\'' + turno.RangoEdad + '\',' + turno.IdObraSocial + ',\'' + turno.ObraSocial + '\',\'' + turno.IdPaciente + '\',\'' + turno.telefono +
            '\',' + turno.IdBarrio + ',\'' + turno.Barrio + '\',' + turno.IdLocalidad +
            ',\'' + turno.Localidad + '\',' + turno.IdDpto + ',\'' + turno.Departamento + '\',' + turno.IdPcia + ',\'' + turno.Provincia +
            '\',' + turno.IdNacionalidad + ',\'' + turno.Nacionalidad + '\',\'' + turno.Calle + '\',\'' + turno.Altura + '\',\'' + turno.Piso +
            '\',\'' + turno.Depto + '\',\'' + turno.Manzana + '\',\'' + turno.Longitud + '\',\'' + turno.Latitud +
            '\',' + turno.Peso + ',' + turno.Talla + ',\'' + turno.TAS + '\',\'' + turno.TAD + '\',\'' + turno.IMC + '\',\'' + turno.RCVG +
            // DATOS CONSULTA
            '\',\'' + turno.asistencia + '\',\'' + turno.reasignado +
            '\',\'' + turno.Diag1CodigoOriginal + '\',\'' + turno.Desc1DiagOriginal + '\',\'' + turno.Diag1CodigoAuditado + '\',\'' + turno.Desc1DiagAuditado +
            '\',\'' + turno.semanticTag1 + '\',\'' + turno.conceptId1 + '\',\'' + turno.term1 + '\',' + turno.primeraVez1 +
            ',\'' + turno.Diag2CodigoOriginal + '\',\'' + turno.Desc2DiagOriginal + '\',\'' + turno.Diag2CodigoAuditado + '\',\'' + turno.Desc2DiagAuditado +
            '\',\'' + turno.semanticTag2 + '\',\'' + turno.conceptId2 + '\',\'' + turno.term2 + '\',' + turno.primeraVez2 +
            ',\'' + turno.Diag3CodigoOriginal + '\',\'' + turno.Desc3DiagOriginal + '\',\'' + turno.Diag3CodigoAuditado + '\',\'' + turno.Desc3DiagAuditado +
            '\',\'' + turno.semanticTag3 + '\',\'' + turno.conceptId3 + '\',\'' + turno.term3 + '\',' + turno.primeraVez3 +
            ',\'' + turno.Profesional + '\',\'' + turno.TipoProfesional + '\',' + turno.CodigoEspecialidad + ',\'' + turno.Especialidad +
            '\',' + turno.CodigoServicio + ',\'' + turno.Servicio + '\',\'' + turno.codifica + '\',' + turno.turnosMobile + '\) ';
        let rta = await existeTurnoPecas(turno.idTurno);
        if (rta.recordset.length > 0 && rta.recordset[0].idTurno) {
            const queryDel = await eliminaTurnoPecas(turno.idTurno);
            if (queryDel.rowsAffected[0] > 0) {
                await executeQuery(queryInsert);
            }
        } else {
            await executeQuery(queryInsert);
        }
    } catch (error) {
        return (error);
    }
}

async function existeTurnoPecas(turno: any) {
    const result = await new sql.Request(poolTurnos)
        .input('idTurno', sql.VarChar(50), turno)
        .query('SELECT idTurno FROM dbo.Pecas_consolidado_2 WHERE idTurno = @idTurno');
    return result;
}

async function eliminaTurnoPecas(turno: any) {
    const result = await new sql.Request(poolTurnos)
        .input('idTurno', sql.VarChar(50), turno)
        .query('DELETE FROM dbo.Pecas_consolidado_2 WHERE idTurno = @idTurno');
    return result;
}

function getEfector(idOrganizacion: any) {
    return new Promise((resolve, reject) => {
        organizacion.findOne({
            _id: mongoose.Types.ObjectId(idOrganizacion)
        }).exec((err, data) => {
            if (err) {
                reject(err);
            }
            if ((data as any).codigo) {
                const codigoSips = (data as any).codigo as any;
                const efector = {
                    codigo: codigoSips.sips ? codigoSips.sips : null,
                    tipoEfector: (data as any).tipoEstablecimiento ? (data as any).tipoEstablecimiento.nombre : ''
                };
                if (codigoSips) {
                    resolve(efector);
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    });
}

/*
[REVISAR]
function getCapitulo(codigoCIE10: string) {
    return new Promise((resolve, reject) => {
        cie10.model.findOne({
            codigo: String(codigoCIE10)
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
*/

function calcularEdad(fechaNacimiento) {
    let edad: any;
    const fechaActual: Date = new Date();
    const fechaAct = moment(fechaActual, 'YYYY-MM-DD HH:mm:ss');
    const difDias = fechaAct.diff(fechaNacimiento, 'd'); // Diferencia en días
    const difAnios = Math.floor(difDias / 365.25);
    const difMeses = Math.floor(difDias / 30.4375);

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
}

function organizacionesExcluidas() {
    let organizaciones = [];
    const medicoIntegral = '5a5e3f7e0bd5677324737244';
    organizaciones.push({ 'organizacion._id': { $ne: mongoose.Types.ObjectId(medicoIntegral) } });
    return organizaciones;
}

async function executeQuery(query: any) {
    try {
        query += ' select SCOPE_IDENTITY() as id';
        const result = await new sql.Request(poolTurnos).query(query);
        if (result && result.recordset) {
            return result.recordset[0].id;
        }
    } catch (err) {
        // console.log('err ', err);
        // let jsonWrite = fs.appendFileSync(outputFile, query + '\r', {
        //     encoding: 'utf8'
        // });
        Logger.log(userScheduler, 'scheduler', 'insert', query);
        return err;
    }
}

