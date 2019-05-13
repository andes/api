import * as configPrivate from '../../../../config.private';
import * as codificacionModel from '../../../rup/schemas/codificacion';
import * as sql from 'mssql';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { Organizacion } from '../../../../core/tm/schemas/organizacion';
import { log } from '@andes/log';
import { sendMail } from '../../../../utils/roboSender/sendEmail';
import { emailListString } from '../../../../config.private';


let poolPrestaciones;
const config = {
    user: configPrivate.conSqlPecas.auth.user,
    password: configPrivate.conSqlPecas.auth.password,
    server: configPrivate.conSqlPecas.serverSql.server,
    database: configPrivate.conSqlPecas.serverSql.database,
    connectionTimeout: 10000,
    requestTimeout: 45000
};
let logRequest = {
    user: {
        usuario: { nombre: 'pecasFueraDeAgenda', apellido: 'pecasFueraDeAgenda' },
        app: 'jobPecas',
        organizacion: 'Subsecretaría de salud'
    },
    ip: 'localhost',
    connection: {
        localAddress: ''
    }
};

let mailOptions = {
    from: 'info@andes.gob.ar',
    to: emailListString,
    subject: 'Error pecas fuera de agenda',
    text: '',
    html: '',
    attachments: null

};
/**
 * Actualiza la tabla fuera_de_agenda de la BD Andes
 *
 * @export fueraAgendaPecas()
 * @returns resultado
 */
export async function fueraAgendaPecas(start, end, done) {
    try {
        poolPrestaciones = await new sql.ConnectionPool(config).connect();
    } catch (ex) {
        // console.log('ex', ex);
        return (ex);
    }

    let orgExcluidas = organizacionesExcluidas();


    let pipeline2 = [];
    pipeline2 = [
        {
            $match: {
                $or: [
                    {
                        $and: [
                            { $or: orgExcluidas },
                            { createdAt: { $gte: new Date(start) } },
                            { createdAt: { $lte: new Date(end) } }
                        ]
                    },
                    {
                        $and: [
                            { $or: orgExcluidas },
                            { updatedAt: { $gte: new Date(start) } },
                            { updatedAt: { $lte: new Date(end) } }
                        ]
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'prestaciones',
                localField: 'idPrestacion',
                foreignField: '_id',
                as: 'prestacion'
            }
        },
        {
            $unwind: '$prestacion',
        }
    ];


    try {
        const prestaciones = codificacionModel.aggregate(pipeline2).cursor({ batchSize: 100 }).exec();
        await prestaciones.eachAsync(async (prestacion, error) => {
            if (error) {
                return error;
            }
            await eliminaPrestacion(prestacion.idPrestacion);
            await auxiliar(prestacion);
        });
        done();
    } catch (error) {
        return (done(error));
    }
}

async function auxiliar(pres: any) {
    let prestacion: any = {};
    let efector: any = {};
    try {
        let org: any = await getEfector(pres.createdBy.organizacion._id);
        efector = {
            tipoEfector: org.tipoEstablecimiento && org.tipoEstablecimiento.nombre ? org.tipoEstablecimiento.nombre : null,
            codigo: org.codigo && org.codigo.sips ? org.codigo.sips : null
        };
        // Chequear si el turno existe en sql PECAS y depeniendo de eso hacer un insert o  un update
        let idEfector = efector && efector.codigo ? parseInt(efector.codigo, 10) : null;
        let tipoEfector = efector && efector.tipoEfector ? efector.tipoEfector : null;
        prestacion.tipoPrestacion = pres.prestacion.solicitud.tipoPrestacion.term;
        prestacion.idEfector = idEfector;
        prestacion.Organizacion = pres.createdBy.organizacion.nombre;
        prestacion.FechaConsulta = moment(pres.createdAt).format('YYYYMMDD');
        // turno.HoraTurno = moment(t.horaInicio).format('HH:mm').toString();
        prestacion.Periodo = parseInt(moment(pres.createdAt).format('YYYYMM').toString(), 10);
        prestacion.DNI = pres.paciente ? Number(pres.paciente.documento) : null;
        prestacion.Apellido = pres.paciente ? pres.paciente.apellido : null;
        prestacion.Apellido = prestacion.Apellido ? prestacion.Apellido.toString().replace('\'', '\'\'') : null;
        prestacion.Nombres = pres.paciente && pres.paciente.nombre ? pres.paciente.nombre.toString().replace('\'', '\'\'') : null;
        const carpetas = pres.paciente && pres.paciente.carpetaEfectores ? pres.paciente.carpetaEfectores.filter(x => String(x.organizacion._id) === String(pres.createdBy.organizacion._id)) : [];
        if (Array(carpetas).length > 0) {
            prestacion.HC = carpetas[0] ? (carpetas[0] as any).nroCarpeta : null;
        } else {
            // prestacion.HC = null;
        }
        prestacion.codSexo = pres.paciente ? String(pres.paciente.sexo) === 'femenino' ? String(2) : String(1) : null;
        prestacion.Sexo = pres.paciente ? pres.paciente.sexo : null;

        prestacion.FechaNacimiento = (pres.paciente && pres.paciente.fechaNacimiento && moment(pres.paciente.fechaNacimiento).year() > 1900) ? moment(pres.paciente.fechaNacimiento).format('YYYYMMDD') : null;
        const objectoEdad = (pres.paciente && prestacion.FechaNacimiento) ? calcularEdad(prestacion.FechaNacimiento) : null;
        prestacion.Edad = pres.paciente && pres.paciente.fechaNacimiento && objectoEdad ? objectoEdad.valor : null;
        prestacion.uniEdad = pres.paciente && pres.paciente.fechaNacimiento && objectoEdad ? objectoEdad.unidad : null;
        prestacion.CodRangoEdad = pres.paciente && pres.paciente.fechaNacimiento && objectoEdad ? objectoEdad.CodRangoEdad : null;
        prestacion.RangoEdad = pres.paciente && pres.paciente.fechaNacimiento && objectoEdad ? objectoEdad.RangoEdad : null;

        prestacion.Peso = null;
        prestacion.Talla = null;
        prestacion.TAS = null;
        prestacion.TAD = null;
        prestacion.IMC = null;
        prestacion.RCVG = null;
        prestacion.codifica = null;
        prestacion.Diag1CodigoOriginal = null;
        prestacion.Desc1DiagOriginal = null;
        prestacion.Diag1CodigoAuditado = null;
        prestacion.Desc1DiagAuditado = null;
        prestacion.conceptId1 = null;
        prestacion.semanticTag1 = null;

        prestacion.term1 = null;
        prestacion.Principal = 0;
        prestacion.Tipodeconsulta = null;
        prestacion.ConsC2 = null;

        // Estado turno
        let estadoAuditoria = null;
        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 0) {
            if (!(pres.diagnostico.codificaciones[0].codificacionAuditoria && pres.diagnostico.codificaciones[0].codificacionAuditoria.codigo) && (pres.diagnostico.codificaciones[0].codificacionProfesional)) {
                estadoAuditoria = 'Registrado por Profesional';
            }
            if ((pres.diagnostico.codificaciones[0].codificacionAuditoria && pres.diagnostico.codificaciones[0].codificacionAuditoria.codigo)) {
                estadoAuditoria = 'Auditado';
            }
        }


        prestacion.estadoAuditoria = estadoAuditoria;
        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 0 && pres.diagnostico.codificaciones[0] && pres.diagnostico.codificaciones[0].primeraVez !== undefined) {
            prestacion.primeraVez1 = (pres.diagnostico.codificaciones[0].primeraVez === true) ? 1 : 0;
        } else {
            prestacion.primeraVez1 = null;
        }

        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 0 && pres.diagnostico.codificaciones[0].codificacionProfesional) {
            prestacion.codifica = 'PROFESIONAL';
            if (pres.diagnostico.codificaciones[0].codificacionProfesional.cie10 && pres.diagnostico.codificaciones[0].codificacionProfesional.cie10.codigo) {
                prestacion.Diag1CodigoOriginal = pres.diagnostico.codificaciones[0].codificacionProfesional.cie10.codigo;
                prestacion.Desc1DiagOriginal = pres.diagnostico.codificaciones[0].codificacionProfesional.cie10.nombre;
            }
            if (pres.diagnostico.codificaciones[0].codificacionProfesional.snomed && pres.diagnostico.codificaciones[0].codificacionProfesional.snomed.conceptId) {
                prestacion.conceptId1 = pres.diagnostico.codificaciones[0].codificacionProfesional.snomed.conceptId;
                prestacion.term1 = pres.diagnostico.codificaciones[0].codificacionProfesional.snomed.term;
                prestacion.semanticTag1 = pres.diagnostico.codificaciones[0].codificacionProfesional.snomed.semanticTag;
            }
        } else {
            prestacion.codifica = 'NO PROFESIONAL';
        }
        // Diagnóstico 1 AUDITADO
        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 0 && pres.diagnostico.codificaciones[0].codificacionAuditoria && pres.diagnostico.codificaciones[0].codificacionAuditoria.codigo) {
            prestacion.Diag1CodigoAuditado = pres.diagnostico.codificaciones[0].codificacionAuditoria.codigo;
            prestacion.Desc1DiagAuditado = pres.diagnostico.codificaciones[0].codificacionAuditoria.nombre;
            prestacion.ConsC2 = pres.diagnostico.codificaciones[0].codificacionAuditoria.c2 && pres.diagnostico.codificaciones[0].primeraVez ? 'SI' : 'NO';
            prestacion.Tipodeconsulta = pres.diagnostico.codificaciones[0].primeraVez ? 'Primera vez' : 'Ulterior';
            prestacion.Principal = 1;
        }

        // Diagnóstico 2 ORIGINAL
        prestacion.Diag2CodigoOriginal = null;
        prestacion.Desc2DiagOriginal = null;
        prestacion.Diag2CodigoAuditado = null;
        prestacion.Desc2DiagAuditado = null;
        prestacion.conceptId2 = null;
        prestacion.term2 = null;
        prestacion.semanticTag2 = null;
        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 1 && pres.diagnostico.codificaciones[1] && pres.diagnostico.codificaciones[1].primeraVez !== undefined) {
            prestacion.primeraVez2 = (pres.diagnostico.codificaciones[1].primeraVez === true) ? 1 : 0;
        } else {
            prestacion.primeraVez2 = null;
        }
        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 1 && pres.diagnostico.codificaciones[1].codificacionProfesional) {
            if (pres.diagnostico.codificaciones[1].codificacionProfesional.cie10 && pres.diagnostico.codificaciones[1].codificacionProfesional.cie10.codigo) {
                prestacion.Diag2CodigoOriginal = pres.diagnostico.codificaciones[1].codificacionProfesional.cie10.codigo;
                prestacion.Desc2DiagOriginal = pres.diagnostico.codificaciones[1].codificacionProfesional.cie10.nombre;
            }
            if (pres.diagnostico.codificaciones[1].codificacionProfesional.snomed && pres.diagnostico.codificaciones[1].codificacionProfesional.snomed.conceptId) {
                prestacion.conceptId2 = pres.diagnostico.codificaciones[1].codificacionProfesional.snomed.conceptId;
                prestacion.term2 = pres.diagnostico.codificaciones[1].codificacionProfesional.snomed.term;
                prestacion.semanticTag2 = pres.diagnostico.codificaciones[1].codificacionProfesional.snomed.semanticTag;
            }
        }
        // Diagnóstico 2 AUDITADO
        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 1 && pres.diagnostico.codificaciones[1].codificacionAuditoria && pres.diagnostico.codificaciones[1].codificacionAuditoria.codigo) {
            prestacion.Diag2CodigoAuditado = pres.diagnostico.codificaciones[1].codificacionAuditoria.codigo;
            prestacion.Desc2DiagAuditado = pres.diagnostico.codificaciones[1].codificacionAuditoria.nombre;
        }

        // Diagnóstico 3 ORIGINAL
        prestacion.Diag3CodigoOriginal = null;
        prestacion.Desc3DiagOriginal = null;
        prestacion.Diag3CodigoAuditado = null;
        prestacion.Desc3DiagAuditado = null;
        prestacion.conceptId3 = null;
        prestacion.term3 = null;
        prestacion.semanticTag3 = null;

        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 2 && pres.diagnostico.codificaciones[2] && pres.diagnostico.codificaciones[2].primeraVez !== undefined) {
            prestacion.primeraVez3 = (pres.diagnostico.codificaciones[2].primeraVez === true) ? 1 : 0;
        } else {
            prestacion.primeraVez3 = null;
        }
        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 2 && pres.diagnostico.codificaciones[2].codificacionProfesional) {
            if (pres.diagnostico.codificaciones[2].codificacionProfesional.cie10 && pres.diagnostico.codificaciones[2].codificacionProfesional.cie10.codigo) {
                prestacion.Diag3CodigoOriginal = pres.diagnostico.codificaciones[2].codificacionProfesional.cie10.codigo;
                prestacion.Desc3DiagOriginal = pres.diagnostico.codificaciones[2].codificacionProfesional.cie10.nombre;
            }
            if (pres.diagnostico.codificaciones[2].codificacionProfesional.snomed && pres.diagnostico.codificaciones[2].codificacionProfesional.snomed.conceptId) {
                prestacion.conceptId3 = pres.diagnostico.codificaciones[2].codificacionProfesional.snomed.conceptId;
                prestacion.term3 = pres.diagnostico.codificaciones[2].codificacionProfesional.snomed.term;
                prestacion.semanticTag3 = pres.diagnostico.codificaciones[2].codificacionProfesional.snomed.semanticTag;
            }
        }
        // Diagnóstico 3 AUDITADO
        if (pres.diagnostico && pres.diagnostico.codificaciones && pres.diagnostico.codificaciones.length > 2 && pres.diagnostico.codificaciones[2].codificacionAuditoria && pres.diagnostico.codificaciones[2].codificacionAuditoria.codigo) {
            prestacion.Diag3CodigoAuditado = pres.diagnostico.codificaciones[2].codificacionAuditoria.codigo;
            prestacion.Desc3DiagAuditado = pres.diagnostico.codificaciones[2].codificacionAuditoria.nombre;
        }

        prestacion.Profesional = pres.createdBy.nombreCompleto.replace('\'', '\'\'');
        prestacion.TipoProfesional = null;
        prestacion.CodigoEspecialidad = null;
        prestacion.Especialidad = null;
        prestacion.CodigoServicio = null;
        prestacion.Servicio = null;
        prestacion.IdBarrio = null;
        prestacion.Barrio = null;
        prestacion.IdLocalidad = null;
        prestacion.Localidad = null;
        prestacion.IdDpto = null;
        prestacion.Departamento = null;
        prestacion.IdPcia = null;
        prestacion.Provincia = null;
        prestacion.IdNacionalidad = null;
        prestacion.Nacionalidad = null;
        prestacion.Calle = null;
        prestacion.Altura = null;
        prestacion.Piso = null;
        prestacion.Depto = null;
        prestacion.Manzana = null;
        prestacion.ConsObst = pres.prestacion.solicitud.tipoPrestacion.term && pres.prestacion.solicitud.tipoPrestacion.term.includes('obstetricia') ? 'SI' : 'NO';
        prestacion.IdObraSocial = (pres.paciente && pres.paciente.obraSocial && pres.paciente.obraSocial.codigo) ? pres.paciente.obraSocial.codigo : null;
        prestacion.ObraSocial = (pres.paciente && pres.paciente.obraSocial && pres.paciente.obraSocial.financiador) ? pres.paciente.obraSocial.financiador.toString().replace('\'', '\'\'') : null;
        if (tipoEfector && tipoEfector === 'Centro de Salud') {
            prestacion.TipoEfector = '1';
        }
        if (tipoEfector && tipoEfector === 'Hospital') {
            prestacion.TipoEfector = '2';
        }
        if (tipoEfector && tipoEfector === 'Puesto Sanitario') {
            prestacion.TipoEfector = '3';
        }
        if (tipoEfector && tipoEfector === 'ONG') {
            prestacion.TipoEfector = '6';
        }
        prestacion.DescTipoEfector = tipoEfector;
        prestacion.IdZona = null;
        prestacion.Zona = null;
        prestacion.SubZona = null;
        prestacion.idEfectorSuperior = null;
        prestacion.EfectorSuperior = null;
        prestacion.AreaPrograma = null;
        prestacion.IdPaciente = (pres.paciente) ? String(pres.paciente.id) : null;
        prestacion.Longitud = '';
        prestacion.Latitud = '';
        prestacion.telefono = pres.paciente && pres.paciente.telefono ? pres.paciente.telefono : '';
        let fechaNac = (prestacion.FechaNacimiento && moment(prestacion.FechaNacimiento).year()) > 1900 ? `'${prestacion.FechaNacimiento}'` : null;

        let queryInsert = 'INSERT INTO ' + configPrivate.conSqlPecas.table.fueraAgenda +
            '(idEfector, Efector, TipoEfector, DescTipoEfector, IdZona, Zona, SubZona, idEfectorSuperior, EfectorSuperior, AreaPrograma, ' +
            'FechaConsulta, Periodo, Tipodeconsulta, estadoAuditoria, Principal, ConsC2, ConsObst, tipoPrestacion, DNI, Apellido, Nombres, ' +
            'HC, CodSexo, Sexo, FechaNacimiento, Edad, UniEdad, CodRangoEdad, RangoEdad, IdObraSocial, ObraSocial, IdPaciente, telefono, ' +
            'idBarrio, Barrio, idLocalidad, Localidad, IdDpto, Departamento, IdPcia, Provincia, IdNacionalidad, Nacionalidad, Calle, Altura,' +
            'Piso, Depto, Manzana, Longitud, Latitud, Peso, Talla, TAS, TAD, IMC, RCVG, Diag1CodigoOriginal, Desc1DiagOriginal,' +
            'Diag1CodigoAuditado, Desc1DiagAuditado, SemanticTag1, SnomedConcept1, SnomedTerm1, primeraVez1, Diag2CodigoOriginal, Desc2DiagOriginal,' +
            'Diag2CodigoAuditado, Desc2DiagAuditado, SemanticTag2, SnomedConcept2, SnomedTerm2, primeraVez2, Diag3CodigoOriginal, Desc3DiagOriginal,' +
            'Diag3CodigoAuditado, Desc3DiagAuditado, SemanticTag3, SnomedConcept3, SnomedTerm3, primeraVez3, Profesional, TipoProfesional,' +
            'CodigoEspecialidad, Especialidad, CodigoServicio, Servicio, codifica, updated, idPrestacion) ' +
            'VALUES  ( ' + prestacion.idEfector + ',\'' + prestacion.Organizacion + '\',\'' + prestacion.TipoEfector + '\',\'' + prestacion.DescTipoEfector +
            '\',' + prestacion.IdZona + ',\'' + prestacion.Zona + '\',\'' + prestacion.SubZona + '\',' + prestacion.idEfectorSuperior + ',\'' + prestacion.EfectorSuperior + '\',\'' + prestacion.AreaPrograma +
            '\',\'' + prestacion.FechaConsulta + '\',\'' + prestacion.Periodo + '\',\'' + prestacion.Tipodeconsulta + '\',\'' + prestacion.estadoAuditoria + '\',\'' + prestacion.Principal +
            '\',\'' + prestacion.ConsC2 + '\',\'' + prestacion.ConsObst + '\',\'' + prestacion.tipoPrestacion +
            // DATOS PACIENTE
            '\',\'' + prestacion.DNI + '\',\'' + prestacion.Apellido + '\',\'' + prestacion.Nombres + '\',\'' + prestacion.HC + '\',\'' + prestacion.codSexo +
            '\',\'' + prestacion.Sexo + '\',' + fechaNac + ',' + prestacion.Edad + ',\'' + prestacion.uniEdad + '\',\'' + prestacion.CodRangoEdad +
            '\',\'' + prestacion.RangoEdad + '\',' + prestacion.IdObraSocial + ',\'' + prestacion.ObraSocial + '\',\'' + prestacion.IdPaciente + '\',\'' + prestacion.telefono +
            '\',' + prestacion.IdBarrio + ',\'' + prestacion.Barrio + '\',' + prestacion.IdLocalidad +
            ',\'' + prestacion.Localidad + '\',' + prestacion.IdDpto + ',\'' + prestacion.Departamento + '\',' + prestacion.IdPcia + ',\'' + prestacion.Provincia +
            '\',' + prestacion.IdNacionalidad + ',\'' + prestacion.Nacionalidad + '\',\'' + prestacion.Calle + '\',\'' + prestacion.Altura + '\',\'' + prestacion.Piso +
            '\',\'' + prestacion.Depto + '\',\'' + prestacion.Manzana + '\',\'' + prestacion.Longitud + '\',\'' + prestacion.Latitud +
            '\',' + prestacion.Peso + ',' + prestacion.Talla + ',\'' + prestacion.TAS + '\',\'' + prestacion.TAD + '\',\'' + prestacion.IMC + '\',\'' + prestacion.RCVG +
            // DATOS CONSULTA
            '\',\'' + prestacion.Diag1CodigoOriginal + '\',\'' + prestacion.Desc1DiagOriginal + '\',\'' + prestacion.Diag1CodigoAuditado + '\',\'' + prestacion.Desc1DiagAuditado +
            '\',\'' + prestacion.semanticTag1 + '\',\'' + prestacion.conceptId1 + '\',\'' + prestacion.term1 + '\',' + prestacion.primeraVez1 +
            ',\'' + prestacion.Diag2CodigoOriginal + '\',\'' + prestacion.Desc2DiagOriginal + '\',\'' + prestacion.Diag2CodigoAuditado + '\',\'' + prestacion.Desc2DiagAuditado +
            '\',\'' + prestacion.semanticTag2 + '\',\'' + prestacion.conceptId2 + '\',\'' + prestacion.term2 + '\',' + prestacion.primeraVez2 +
            ',\'' + prestacion.Diag3CodigoOriginal + '\',\'' + prestacion.Desc3DiagOriginal + '\',\'' + prestacion.Diag3CodigoAuditado + '\',\'' + prestacion.Desc3DiagAuditado +
            '\',\'' + prestacion.semanticTag3 + '\',\'' + prestacion.conceptId3 + '\',\'' + prestacion.term3 + '\',' + prestacion.primeraVez3 +
            ',\'' + prestacion.Profesional + '\',\'' + prestacion.TipoProfesional + '\',' + prestacion.CodigoEspecialidad + ',\'' + prestacion.Especialidad +
            '\',' + prestacion.CodigoServicio + ',\'' + prestacion.Servicio + '\',\'' + prestacion.codifica + '\',\'' + moment().format('YYYYMMDD HH:mm') + '\',\'' + pres.idPrestacion + '\')';

        return executeQuery(queryInsert);

    } catch (error) {
        await log(logRequest, 'andes:pecas:bi', null, 'SQLOperation', null, error);
        return (error);
    }
}

function organizacionesExcluidas() {
    let organizaciones = [];
    const medicoIntegral = '5a5e3f7e0bd5677324737244';
    organizaciones.push({ 'organizacion._id': { $ne: mongoose.Types.ObjectId(medicoIntegral) } });
    return organizaciones;
}

async function eliminaPrestacion(idPrestacion: string) {
    const result = new sql.Request(poolPrestaciones);
    let query = `DELETE FROM ${configPrivate.conSqlPecas.table.fueraAgenda} WHERE idPrestacion='${idPrestacion}'`;
    return executeQuery(query);
}

const orgCache = {};
async function getEfector(idOrganizacion: any) {
    if (orgCache[idOrganizacion]) {
        return orgCache[idOrganizacion];
    } else {
        const org: any = await Organizacion.findById(idOrganizacion);
        if (org) {
            orgCache[idOrganizacion] = org;
            return org;
        }
        return null;
    }
}

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

async function executeQuery(query: any) {
    try {
        await new sql.Request(poolPrestaciones).query(query);
    } catch (err) {
        await log(logRequest, 'andes:pecas:bi', null, 'SQLOperation', query, err);
        let options = mailOptions;
        options.text = `'error al insertar en sql fuera Agenda: ${query}'`;
        sendMail(mailOptions);
        return err;
    }
}
