// Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../../legacy/schemas/agendasCache';
import {
    Matching
} from '@andes/match';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as config from '../../../../config';
import * as pacientes from './../../../../core/mpi/controller/paciente';
import * as constantes from '../../../legacy/schemas/constantes';
import * as logger from './../../../../utils/loggerAgendaSipsCache';
import * as agendaSchema from '../../schemas/agenda';
import * as turnoCtrl from './../turnoCacheController';


let transaction;

export async function verificarPaciente(pacienteSips: any, poolAgendas: any) {
    try {
        let idPacienteSips;
        let idPaciente = await existePacienteSips(pacienteSips, poolAgendas);

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

            idPacienteSips = await executeQuery(query, poolAgendas);
        } else {
            idPacienteSips = idPaciente;
        }
        return (idPacienteSips);
    } catch (ex) {
        return (ex);
    }
}

/** Este método se llama desde grabaTurnoSips */
export async function insertarPacienteEnSips(paciente: any, idEfectorSips: any, poolAgendas: any) {
    let identificador = [];
    try {
        // Verifica el array de identificadores de paciente de Andes. Busca si tiene un idSips asigando
        if (paciente && paciente.identificadores) {
            identificador = paciente.identificadores.filter(elem => elem.entidad === 'SIPS');
        }

        if (identificador && identificador.length > 0) {
            return parseInt(identificador[0].valor, 0);
        } else {

             // Busca paciente por documento y realiza un matcheo
            let idPaciente = await buscarPacientePorDocumentoEnSips(paciente, poolAgendas);
            if (idPaciente) {
                return idPaciente;
            } else {
                let pacienteSips = {
                    idEfector: idEfectorSips,
                    nombre: paciente.nombre,
                    apellido: paciente.apellido,
                    numeroDocumento: paciente.documento,
                    idSexo: (paciente.sexo === 'masculino' ? 3 : paciente.sexo === 'femenino' ? 2 : 1),
                    fechaNacimiento: paciente.fechaNacimiento ? moment(paciente.fechaNacimiento).format('YYYYMMDD') : '19000101',
                    idEstado: (paciente.estado === 'validado' ? 3 : 2),
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

                let idPacienteSips = await verificarPaciente(pacienteSips, poolAgendas);
                return (idPacienteSips);
            }
        }

    } catch (ex) {
        return (ex);
    }
}

function matchPaciente(pacMpi, pacSips) {
    let weights = config.mpi.weightsDefault;

    let pacAndes = {
        documento: pacMpi.documento ? pacMpi.documento.toString() : '',
        nombre: pacMpi.nombre ? pacMpi.nombre : '',
        apellido: pacMpi.apellido ? pacMpi.apellido : '',
        fechaNacimiento: pacMpi.fechaNacimiento ? moment(new Date(pacMpi.fechaNacimiento)).format('YYYY-MM-DD') : '',
        sexo: pacMpi.sexo ? pacMpi.sexo : ''
    };
    let pac = {
        documento: pacSips.numeroDocumento ? pacSips.numeroDocumento.toString() : '',
        nombre: pacSips.nombre ? pacSips.nombre : '',
        apellido: pacSips.apellido ? pacSips.apellido : '',
        fechaNacimiento: pacSips.fechaNacimiento ? moment(pacSips.fechaNacimiento, 'DD/MM/YYYY').format('YYYY-MM-DD') : '',
        sexo: (pacSips.idSexo === 2 ? 'femenino' : (pacSips.idSexo === 3 ? 'masculino' : ''))
    };
    let match = new Matching();
    return match.matchPersonas(pacAndes, pac, weights, config.algoritmo);
}

async function buscarPacientePorDocumentoEnSips(paciente, poolAgendas) {
    let idPacienteSips = 0;
    try {
        let query = 'SELECT * FROM dbo.Sys_Paciente WHERE numeroDocumento = @documento';
        let result = await new sql.Request(poolAgendas)
            .input('documento', sql.VarChar(50), paciente.documento)
            .query(query);

        if (result.recordset && result.recordset.length) {
            // Se realiza un matcheo con todos los paciente encontrados en sips
            let pacientesSips = result.recordset;
            let pacienteEncontrado = pacientesSips.find(pac => {
                if (matchPaciente(paciente, pac) >= 0.95) {
                    return pac;
                }
            });
            if (pacienteEncontrado) {
                idPacienteSips = pacienteEncontrado.idPaciente;
            }
            return (idPacienteSips);
        } else {
            return (idPacienteSips);
        }

    } catch (err) {
        return (err);
    }
}

async function existePacienteSips(pacienteSips, poolAgendas) {
    let idPacienteSips;
    try {
        let query = 'SELECT idPaciente FROM dbo.Sys_Paciente WHERE objectId = @objectId';
        let result = await new sql.Request(poolAgendas)
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

async function executeQuery(query: any, poolAgendas) {
    try {
        query += ' select SCOPE_IDENTITY() as id';
        let result = await new sql.Request(poolAgendas).query(query);
        if (result.recordset) {
            return result.recordset[0].id;
        }
    } catch (err) {
        return (err);
    }
}
