// Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../../legacy/schemas/agendasCache';
import * as organizacion from '../../../../core/tm/schemas/organizacion';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as configPrivate from '../../../../config.private';
import * as dbg from 'debug';
import * as constantes from '../../../legacy/schemas/constantes';
import { paciente, pacienteMpi } from '../../../../core/mpi/schemas/paciente'
const debug = dbg('integracion');

let transaction;
let poolAgendas;
let config = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database,
    requestTimeout: 45000
};

let comprobante = {
    id: null,
    cuie: null, // listo
    id_factura: null,
    nombre_medico: null,
    fecha_comprobante: new Date(),//listo
    clavebeneficiario: null,// listo
    id_smiafiliados: null,// listo
    fecha_carga: new Date(),
    comentario: null,
    marca: 0,
    periodo: null,// listo
    id_servicio: null,
    activo: 'S',
    id_beneficiarios: null,
    alta_comp: null,
    idTipoPrestacion: 1,
};


export async function facturacionSumar(agenda: any) {
    completaComprobante(agenda)
}


export async function completaComprobante(agenda) { 

    for (var index = 0; index < agenda.length; index++) {
        await comprobaciones(agenda[index].paciente.documento, agenda[index].efector)
    }

    return comprobante;
}

async function comprobaciones(documento, efectorEntrada) {
    let efector = await mapeoEfector(efectorEntrada)
    comprobante.cuie = efector.cuie;

    console.log("Documen: ", documento)
    // VERIFICA SI ES PACIENTE
    if (await mapeoPacientes(documento)) {
        console.log("es Paciente")
        // VERIFICA SI EL PACIENTE ES BENEFICIARIO
        if (await mapeoBeneficiario(documento)) {
            console.log("es Beneficiario")
            // VERIFICA SI EL PACIENTE ES AFILIADO
            if (await mapeoSfiadiliados(documento) !== undefined) {
                // COMPLETA LOS DATOS DEL COMPROBANTE
                console.log("es smAfiliado")

                let resSmafiliados = await mapeoSfiadiliados(documento);
                if (resSmafiliados) {
                    comprobante.clavebeneficiario = resSmafiliados.clavebeneficiario;
                    comprobante.id_smiafiliados = resSmafiliados.idSmiafiliados
                    comprobante.periodo = comprobante.fecha_comprobante.getFullYear() + "/" + (comprobante.fecha_comprobante.getMonth() + 1);
                    console.log("comprobante", comprobante);
                };
            } else {
                // SE INSERTA EN LA TABLA AFILIADO
                console.log("no es smAfiliado")
            }
        } else {
            // SE INSERTA EN LA TABLA BENEFICIARIO
            console.log("no es Beneficiario")
        }
    } else {
        // DEBE INGRESAR AL PACIENTE Y VOLVER A LLAMAR A LA FUNCION        
        console.log("buscamos paciente en mongo y despues insertamos")
        await traePacienteMongo("59cd3430055fd362a46fd48d", efector)
    }
}

// mapeo de los efectores
async function mapeoEfector(idEfector) {
    let efectorMongo: any = await mapeoEfectorMongo(idEfector);

    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'SELECT * FROM dbo.Sys_efector WHERE cuie = @codigo';
    let resultado = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), efectorMongo.codigo.cuie)
        .query(query);
    poolAgendas.close()

    return resultado.recordset[0];
}

/* Se trae el efector de mongo por ObjectId*/
async function mapeoEfectorMongo(idEfector: any) {
    return new Promise((resolve, reject) => {
        organizacion.model.findById(idEfector).then(efector => {
            // console.log("Efector: ", efector)

            resolve(efector);
        })
    });
}

async function mapeoPacientes(documento) {
    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'Select * from dbo.Sys_paciente WHERE numeroDocumento = @documento';
    let resultado = await new sql.Request(poolAgendas)
        .input('documento', sql.VarChar(50), documento)
        .query(query);
    poolAgendas.close()

    console.log("REsult PAciente: ", resultado.recordset)
    if (resultado.recordset.length > 0) {
        return true;
    } else {
        return false;
    }
}


async function mapeoBeneficiario(documento) {
    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'Select * from dbo.PN_beneficiarios  WHERE numero_doc = @documento';
    let resultado = await new sql.Request(poolAgendas)
        .input('documento', sql.VarChar(50), documento)
        .query(query);
    poolAgendas.close()
    if (resultado.recordset.length > 0) {
        return true;
    } else {
        return false;
    }
}

// mapeo de los pacientes
async function mapeoSfiadiliados(documento) {
    let resultado;
    poolAgendas = await new sql.ConnectionPool(config).connect();
    let queryPaciente = 'SELECT * FROM  dbo.PN_smiafiliados WHERE afidni = @documento';
    let paciente = await new sql.Request(poolAgendas)
        .input('documento', sql.VarChar(50), documento)
        .query(queryPaciente);
    poolAgendas.close();
    if (paciente.recordset.length > 0) {
        resultado = {
            clavebeneficiario: paciente.recordset[0].clavebeneficiario,
            idSmiafiliados: paciente.recordset[0].id_smiafiliados
        }
    }

    return resultado;
}


async function traePacienteMongo(id, efector) {


    return new Promise((resolve, reject) => {
        paciente.find({
            '_id': id
        }, function (err, paciente: any) {
            let pacienteSips = {
                idEfector: efector.idEfector,
                nombre: paciente[0].nombre,
                apellido: paciente[0].apellido,
                numeroDocumento: paciente[0].documento,
                idSexo: (paciente[0].sexo === 'masculino' ? 3 : paciente[0].sexo === 'femenino' ? 2 : 1),
                fechaNacimiento: paciente[0].fechaNacimiento ? moment(paciente[0].fechaNacimiento).format('YYYYMMDD') : '19000101',
                idEstado: (paciente[0].estado === 'validado' ? 3 : 2),
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
                objectId: paciente[0]._id
            };

            // console.log(pacienteSips)
            resolve(paciente)
        });
    });
}