import * as moment from 'moment';
import { Pecas } from '../schemas/pecas';
import * as sql from 'mssql';
import * as configPrivate from '../../../../config.private';
import { Organizacion } from '../../../../core/tm/schemas/organizacion';
import { pecasExport, exportDinamicasSinTurnos } from '../controller/aggregateQueryPecas';
import { log } from '@andes/log';
import { sendMail } from '../../../../utils/roboSender/sendEmail';
import { emailListString } from '../../../../config.private';


let poolTurnos;
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
        usuario: { nombre: 'pecasConsolidadoJob', apellido: 'pecasConsolidadoJob' },
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
    subject: 'Error pecas',
    text: '',
    html: '',
    attachments: null

};

/**
 * Actualiza la tabla pecas_consolidado de la BD Andes
 *
 * @export consultaPecas()
 * @returns resultado
 */
export async function consultaPecas(done, start, end) {
    try {
        poolTurnos = await new sql.ConnectionPool(config).connect();
        // Eliminamos los registros temporales de PECAS
        await Pecas.remove({});
        // Exportamos los registros directamente desde mongodb
        await pecasExport(start, end);
        exportDinamicasSinTurnos(start, end);

        let pecasData: any = await Pecas.find({});
        let insertsArray = [];
        let cantidadRegistros = pecasData.length;
        let conjunto = pecasData.map(data => data.idAgenda);
        let idsAgendas = [...new Set(conjunto)];
        await Promise.all(
            idsAgendas.map(eliminaAgenda)
        );

        // Realizamos le proceso de insertado a pecas SQL
        if (cantidadRegistros > 0) {
            for (let i = 0; i < cantidadRegistros; i++) {
                let doc = pecasData[i];
                let org = await getEfector(doc.idEfector);
                let idEfectorSips = org.codigo && org.codigo.sips ? org.codigo.sips : null;
                insertsArray.push(insertCompleto(doc, idEfectorSips));
            }
            await Promise.all(insertsArray);
            return (done());
        } else {
            return (done(null));
        }
    } catch (error) {
        await log(logRequest, 'andes:pecas:bi', null, 'delete', error, null);
        return (done(error));
    }
}

// castea cada turno asignado y lo inserta en la tabla Sql
async function insertCompleto(turno: any, idEfectorSips) {
    // Chequeos necesarios
    let fechaNac = (turno.FechaNacimiento && moment(turno.FechaNacimiento).year()) > 1900 ? `'${turno.FechaNacimiento}'` : null;
    let FechaConsulta = turno.FechaConsulta ? `'${turno.FechaConsulta}'` : null;
    let reasignado = turno.reasignado ? `'${turno.reasignado}'` : null;
    let periodo = turno.periodo ? `'${turno.periodo}'` : null;

    let dni = turno.DNI !== '' ? turno.DNI : null;
    let profesional = turno.Profesional ? turno.Profesional.replace('\'', '\'\'') : null;
    let pacienteApellido = turno.Apellido ? turno.Apellido.replace('\'', '\'\'') : null;
    let pacienteNombres = turno.Nombres ? turno.Nombres.replace('\'', '\'\'') : null;
    let pacienteObraSocial = turno.ObraSocial ? turno.ObraSocial.replace('\'', '\'\'') : null;
    let turnosDelDia = turno.turnosDelDia ? turno.turnosDelDia : null;
    let turnosLlaves = turno.turnosLlaves ? turno.turnosLlaves : null;
    let pacienteTelefono = turno.Telefono ? turno.Telefono : null;
    let turnosProfesional = turno.turnosProfesional ? turno.turnosProfesional : null;
    let turnosProgramados = turno.turnosProgramados ? turno.turnosProgramados : null;
    let numeroBloque = turno.sobreturno === 'SI' ? -1 : turno.numeroBloque;


    let queryInsert = 'INSERT INTO ' + configPrivate.conSqlPecas.table.pecasTable +
        '(idEfector, Efector, TipoEfector, DescTipoEfector, IdZona, Zona, SubZona, idEfectorSuperior, EfectorSuperior, AreaPrograma, ' +
        'idAgenda, FechaAgenda, HoraAgenda, estadoAgenda, numeroBloque, turnosProgramados, turnosProfesional, turnosLlaves, turnosDelDia, ' +
        'idTurno, estadoTurno, tipoTurno, sobreturno, FechaConsulta, HoraTurno, Periodo, Tipodeconsulta, estadoTurnoAuditoria, Principal, ConsC2, ConsObst, tipoPrestacion, ' +
        'DNI, Apellido, Nombres, HC, CodSexo, Sexo, FechaNacimiento, Edad, UniEdad, CodRangoEdad, RangoEdad, IdObraSocial, ObraSocial, IdPaciente, Telefono, ' +
        'IdBarrio, Barrio, IdLocalidad, Localidad, IdDpto, Departamento, IdPcia, Provincia, IdNacionalidad, Nacionalidad, ' +
        'Calle, Altura, Piso, Depto, Manzana, Longitud, Latitud, ' +
        'Peso, Talla, TAS, TAD, IMC, RCVG, asistencia, reasignado, ' +
        'Diag1CodigoOriginal, Desc1DiagOriginal, Diag1CodigoAuditado, Desc1DiagAuditado, SemanticTag1, SnomedConcept1, SnomedTerm1, primeraVez1, ' +
        'Diag2CodigoOriginal, Desc2DiagOriginal, Diag2CodigoAuditado, Desc2DiagAuditado, SemanticTag2, SnomedConcept2, SnomedTerm2, primeraVez2, ' +
        'Diag3CodigoOriginal, Desc3DiagOriginal, Diag3CodigoAuditado, Desc3DiagAuditado, SemanticTag3, SnomedConcept3, SnomedTerm3, primeraVez3, ' +
        'Profesional, TipoProfesional, CodigoEspecialidad, Especialidad, CodigoServicio, Servicio, ' +
        'codifica, turnosMobile, updated) ' +
        'VALUES  (' + idEfectorSips + ',\'' + turno.Efector + '\',\'' + turno.TipoEfector + '\',\'' + turno.DescTipoEfector +
        '\',' + turno.IdZona + ',' + turno.Zona + ',' + turno.SubZona + ',' + turno.idEfectorSuperior + ',\'' + turno.EfectorSuperior + '\',\'' + turno.AreaPrograma +
        '\',\'' + turno.idAgenda + '\',\'' + turno.FechaAgenda + '\',\'' + turno.HoraAgenda + '\',\'' + turno.estadoAgenda +
        '\',' + numeroBloque + ',' + turnosProgramados + ',' + turnosProfesional + ',' + turnosLlaves + ',' + turnosDelDia +
        ',\'' + turno.idTurno + '\',\'' + turno.estadoTurno + '\',\'' + turno.tipoTurno + '\',\'' + turno.sobreturno + '\',' + FechaConsulta + ',\'' + turno.HoraTurno + '\',' + periodo + ',\'' + turno.Tipodeconsulta + '\',\'' + turno.estadoTurnoAuditoria + '\',\'' + turno.Principal +
        '\',\'' + turno.ConsC2 + '\',\'' + turno.ConsObst + '\',\'' + turno.tipoPrestacion +
        // DATOS PACIENTE
        '\',' + dni + ',\'' + pacienteApellido + '\',\'' + pacienteNombres + '\',\'' + turno.HC + '\',\'' + turno.CodSexo +
        '\',\'' + turno.Sexo + '\',' + fechaNac + ',' + turno.Edad + ',\'' + turno.UniEdad + '\',\'' + turno.CodRangoEdad +
        '\',\'' + turno.RangoEdad + '\',' + turno.IdObraSocial + ',\'' + pacienteObraSocial + '\',\'' + turno.IdPaciente + '\',\'' + pacienteTelefono +
        '\',' + turno.IdBarrio + ',\'' + turno.Barrio + '\',' + turno.IdLocalidad +
        ',\'' + turno.Localidad + '\',' + turno.IdDpto + ',\'' + turno.Departamento + '\',' + turno.IdPcia + ',\'' + turno.Provincia +
        '\',' + turno.IdNacionalidad + ',\'' + turno.Nacionalidad + '\',\'' + turno.Calle + '\',\'' + turno.Altura + '\',\'' + turno.Piso +
        '\',\'' + turno.Depto + '\',\'' + turno.Manzana + '\',\'' + turno.Longitud + '\',\'' + turno.Latitud +
        '\',' + turno.Peso + ',' + turno.Talla + ',\'' + turno.TAS + '\',\'' + turno.TAD + '\',\'' + turno.IMC + '\',\'' + turno.RCVG +
        // DATOS CONSULTA
        '\',\'' + turno.asistencia + '\',' + reasignado +
        ',\'' + turno.Diag1CodigoOriginal + '\',\'' + turno.Desc1DiagOriginal + '\',\'' + turno.Diag1CodigoAuditado + '\',\'' + turno.Desc1DiagAuditado +
        '\',\'' + turno.SemanticTag1 + '\',\'' + turno.SnomedConcept1 + '\',\'' + turno.SnomedTerm1 + '\',' + turno.primeraVez1 +
        ',\'' + turno.Diag2CodigoOriginal + '\',\'' + turno.Desc2DiagOriginal + '\',\'' + turno.Diag2CodigoAuditado + '\',\'' + turno.Desc2DiagAuditado +
        '\',\'' + turno.SemanticTag2 + '\',\'' + turno.SnomedConcept2 + '\',\'' + turno.SnomedTerm2 + '\',' + turno.primeraVez2 +
        ',\'' + turno.Diag3CodigoOriginal + '\',\'' + turno.Desc3DiagOriginal + '\',\'' + turno.Diag3CodigoAuditado + '\',\'' + turno.Desc3DiagAuditado +
        '\',\'' + turno.SemanticTag3 + '\',\'' + turno.SnomedConcept3 + '\',\'' + turno.Snomedterm3 + '\',' + turno.primeraVez3 +
        ',\'' + profesional + '\',\'' + turno.TipoProfesional + '\',' + turno.CodigoEspecialidad + ',\'' + turno.Especialidad +
        '\',' + turno.CodigoServicio + ',\'' + turno.Servicio + '\',\'' + turno.codifica + '\',' + turno.turnosMobile + ',\'' + moment().format('YYYYMMDD HH:mm') + '\') ';
    try {
        let resultado = await executeQuery(queryInsert);
        return resultado;
    } catch (error) {
        await log(logRequest, 'andes:pecas:bi', null, 'insert', error, null);
        return (error);
    }
}


// async function insertar_agenda(a: any, num_bloque: any) {
//     let ag: any = {};
//     let efector: any = {};
//     try {
//         let org: any = await getEfector(a.organizacion._id);
//         efector = {
//             tipoEfector: org.tipoEstablecimiento && org.tipoEstablecimiento.nombre ? org.tipoEstablecimiento.nombre : null,
//             codigo: org.codigo && org.codigo.sips ? org.codigo.sips : null
//         };
//         let idEfector = efector && efector.codigo ? parseInt(efector.codigo, 10) : null;
//         let tipoEfector = efector && efector.tipoEfector ? efector.tipoEfector : null;
//         ag.idEfector = idEfector;
//         ag.Organizacion = a.organizacion.nombre;
//         ag.idAgenda = a._id;
//         ag.tipoPrestacion = a.tipoPrestaciones && a.tipoPrestaciones.length && a.tipoPrestaciones[0] ? a.tipoPrestaciones[0].term : null;
//         ag.FechaAgenda = moment(a.horaInicio).format('YYYYMMDD');
//         ag.HoraAgenda = moment(a.horaInicio).format('HH:mm').toString();
//         ag.estadoAgenda = a.estado;
//         ag.numeroBloque = num_bloque;
//         ag.idTurno = a.bloques && a.bloques.length ? a.bloques[0]._id : null;


//         if (tipoEfector && tipoEfector === 'Centro de Salud') {
//             ag.TipoEfector = '1';
//         }
//         if (tipoEfector && tipoEfector === 'Hospital') {
//             ag.TipoEfector = '2';
//         }
//         if (tipoEfector && tipoEfector === 'Puesto Sanitario') {
//             ag.TipoEfector = '3';
//         }
//         if (tipoEfector && tipoEfector === 'ONG') {
//             ag.TipoEfector = '6';
//         }
//         ag.DescTipoEfector = tipoEfector;

//         let queryInsert = 'INSERT INTO ' + configPrivate.conSqlPecas.table.pecasTable +
//             '(idEfector, Efector, TipoEfector, DescTipoEfector, idAgenda, FechaAgenda, HoraAgenda, estadoAgenda, numeroBloque,  idTurno, tipoPrestacion,  updated) ' +
//             'VALUES  ( ' + ag.idEfector + ',\'' + ag.Organizacion + '\',\'' + ag.TipoEfector + '\',\'' + ag.DescTipoEfector +
//             '\',\'' + ag.idAgenda + '\',\'' + ag.FechaAgenda + '\',\'' + ag.HoraAgenda + '\',\'' + ag.estadoAgenda +
//             '\',' + ag.numeroBloque + ',\'' + ag.idTurno + '\',\'' + ag.tipoPrestacion + '\',\'' + moment().format('YYYYMMDD HH:mm') + '\') ';
//         await executeQuery(queryInsert);

//     } catch (error) {
//         return (error);
//     }
// }

/**
 * @param request sql request object
 * @param {string} columnName sql table column name
 * @param {string} paramNamePrefix prefix for parameter name
 * @param type parameter type
 * @param {Array<string>} values an array of values
 */
function parameteriseQueryForIn(request, columnName, parameterNamePrefix, type, values) {
    let parameterNames = [];
    for (let i = 0; i < values.length; i++) {
        let parameterName = parameterNamePrefix + i;
        request.input(parameterName, type, values[i]);
        parameterNames.push(`@${parameterName}`);
    }
    return `${columnName} IN (${parameterNames.join(',')})`;
}

async function eliminaAgendas(idsAgendas: any[]) {
    const result = new sql.Request(poolTurnos);
    let query = `DELETE FROM ${configPrivate.conSqlPecas.table.pecasTable} WHERE ` + parameteriseQueryForIn(result, 'idAgenda', 'idAgenda', sql.NVarChar, idsAgendas);
    try {
        return executeQuery(query);
    } catch (err) {
        let options = mailOptions;
        options.text = `'error en el delete: ${query}'`;
        sendMail(mailOptions);
        await log(logRequest, 'andes:pecas:bi', null, 'delete', err, null);
    }
}

async function eliminaAgenda(idAgenda) {
    // const result = new sql.Request(poolTurnos);
    let query = `DELETE FROM ${configPrivate.conSqlPecas.table.pecasTable} WHERE idAgenda ='${idAgenda}'`;
    try {
        return executeQuery(query);
        // return result.query(query);
    } catch (err) {
        let options = mailOptions;
        options.text = `'error en el delete: ${query}'`;
        sendMail(mailOptions);
        await log(logRequest, 'andes:pecas:bi', null, 'delete', err, null);
    }
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

async function executeQuery(query: any) {
    try {
        await new sql.Request(poolTurnos).query(query);
    } catch (err) {
        let options = mailOptions;
        options.text = `'error en consulta sql: ${query}'`;
        sendMail(mailOptions);
        await log(logRequest, 'andes:pecas:bi', null, 'SQLOperation', query, err);
        return err;
    }
}

