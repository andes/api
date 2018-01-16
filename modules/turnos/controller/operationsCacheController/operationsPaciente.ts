// Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../../legacy/schemas/agendasCache';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as pacientes from './../../../../core/mpi/controller/paciente';
import * as constantes from '../../../legacy/schemas/constantes';
import * as logger from './../../../../utils/loggerAgendaSipsCache';
import * as agendaSchema from '../../schemas/agenda';
import * as turnoCtrl from './../turnoCacheController';

let transaction;

export async function verificarPaciente(pacienteSips: any) {
    try {
        let idPacienteSips;
        let idPaciente = await existePacienteSips(pacienteSips);
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
                pacienteSips.idEfector + ', ' +
                '\'' + pacienteSips.apellido + '\',' +
                '\'' + pacienteSips.nombre + '\', ' +
                pacienteSips.numeroDocumento + ', ' +
                pacienteSips.idSexo + ', ' +
                '\'' + pacienteSips.fechaNacimiento + '\',' +
                pacienteSips.idEstado + ', ' +
                pacienteSips.idMotivoNI + ', ' +
                pacienteSips.idPais + ', ' +
                pacienteSips.idProvincia + ', ' +
                pacienteSips.idNivelInstruccion + ', ' +
                pacienteSips.idSituacionLaboral + ', ' +
                pacienteSips.idProfesion + ', ' +
                pacienteSips.idOcupacion + ', ' +
                '\'' + pacienteSips.calle + '\', ' +
                pacienteSips.numero + ', ' +
                '\'' + pacienteSips.piso + '\', ' +
                '\'' + pacienteSips.departamento + '\', ' +
                '\'' + pacienteSips.manzana + '\', ' +
                pacienteSips.idBarrio + ', ' +
                pacienteSips.idLocalidad + ', ' +
                pacienteSips.idDepartamento + ', ' +
                pacienteSips.idProvinciaDomicilio + ', ' +
                '\'' + pacienteSips.referencia + '\', ' +
                '\'' + pacienteSips.informacionContacto + '\', ' +
                pacienteSips.cronico + ', ' +
                pacienteSips.idObraSocial + ', ' +
                pacienteSips.idUsuario + ', ' +
                '\'' + pacienteSips.fechaAlta + '\', ' +
                '\'' + pacienteSips.fechaDefuncion + '\', ' +
                '\'' + pacienteSips.fechaUltimaActualizacion + '\', ' +
                pacienteSips.idEstadoCivil + ', ' +
                pacienteSips.idEtnia + ', ' +
                pacienteSips.idPoblacion + ', ' +
                pacienteSips.idIdioma + ', ' +
                '\'' + pacienteSips.otroBarrio + '\', ' +
                '\'' + pacienteSips.camino + '\', ' +
                '\'' + pacienteSips.campo + '\', ' +
                pacienteSips.esUrbano + ', ' +
                '\'' + pacienteSips.lote + '\', ' +
                '\'' + pacienteSips.parcela + '\', ' +
                '\'' + pacienteSips.edificio + '\', ' +
                pacienteSips.activo + ', ' +
                '\'' + pacienteSips.fechaAltaObraSocial + '\', ' +
                '\'' + pacienteSips.numeroAfiliado + '\', ' +
                '\'' + pacienteSips.numeroExtranjero + '\', ' +
                '\'' + pacienteSips.telefonoFijo + '\', ' +
                '\'' + pacienteSips.telefonoCelular + '\', ' +
                '\'' + pacienteSips.email + '\', ' +
                '\'' + pacienteSips.latitud + '\', ' +
                '\'' + pacienteSips.longitud + '\', ' +
                '\'' + pacienteSips.objectId + '\' ' +
                ') ';

            idPacienteSips = await executeQuery(query);
        } else {
            idPacienteSips = idPaciente;
        }
        return (idPacienteSips);
    } catch (ex) {
        return (ex);
    }
}

/** Este método se llama desde grabaTurnoSips */
export async function insertarPacienteEnSips(paciente: any, idEfectorSips: any, tr) {
    transaction = tr;
    try {
        let pacienteSips = {
            idEfector: idEfectorSips,
            nombre: paciente.nombre,
            apellido: paciente.apellido,
            numeroDocumento: paciente.documento,
            idSexo: (paciente.sexo === 'masculino' ? 3 : paciente.sexo === 'femenino' ? 2 : 1),
            fechaNacimiento: moment(paciente.fechaNacimiento).format('YYYYMMDD'),
            idEstado: 3,
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
            idObraSocial: 499,
            idUsuario: constantes.idUsuarioSips,
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
            objectId: paciente._id
        };

        let idPacienteSips = await verificarPaciente(pacienteSips);

        return (idPacienteSips);
    } catch (ex) {
        return (ex);
    }
}

async function existePacienteSips(pacienteSips) {
    let idPacienteSips;
    try {
        let query = 'SELECT idPaciente FROM dbo.Sys_Paciente WHERE objectId = @objectId';
        let result = await new sql.Request(transaction)
            .input('objectId', sql.VarChar(50), pacienteSips.objectId)
            .query(query);

        if (result.recordset && result.recordset.length > 0) {
            idPacienteSips = result.recordset[0].idPaciente;
            return (idPacienteSips);
        } else {
            idPacienteSips = 0;
            return (idPacienteSips);
        }

    } catch (err) {
        return (err);
    }
}

async function executeQuery(query: any) {
    try {
        query += ' select SCOPE_IDENTITY() as id';
        let result = await new sql.Request(transaction).query(query);
        if (result.recordset) {
            return result.recordset[0].id;
        }
    } catch (err) {
        return (err);
    }
}
