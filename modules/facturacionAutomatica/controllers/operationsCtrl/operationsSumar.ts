// Imports
import * as mongoose from 'mongoose';
import { agendasCache } from '../../../legacy/schemas/agendasCache';
import * as organizacion from '../../../../core/tm/schemas/organizacion';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as configPrivate from '../../../../config.private';
import * as dbg from 'debug';
import * as operacionesLegacy from './../../../legacy/controller/operations';

import * as pacienteCrtl from './../../../../core/mpi/controller/paciente';
import * as constantes from '../../../legacy/schemas/constantes';
import { paciente, pacienteMpi } from '../../../../core/mpi/schemas/paciente'
import { insertarPacienteEnSips } from '../../../turnos/controller/operationsCacheController/operationsPaciente';
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
var thingSchema = new mongoose.Schema({
    id: Object,
    tipoPrestacion: Object,
    nomencladorSUMAR: String,
    nomencladorRecuperoFinanciero: String

});
export let configuracionPrestaciones = mongoose.model('configuracionPrestacion', thingSchema, 'configuracionPrestacion');
/* IMPORTANTE!!!!!
TENER EN CUENTA QUE PARA FACTURAR EL PACIENTE TIENE QUE EXISTIR EN LA TABLA PN_SMIAFILIADOS Y QUE ESTAR ACTIVO*/
export async function facturacionSumar(agenda: any) {

    for (var index = 0; index < agenda.length; index++) {
        let afiliadoSumar = await getAfiliadoSumar(agenda[index].paciente.documento);
let efector = await mapeoEfector(agenda[index].efector);
        if (afiliadoSumar.length > 0) {
            let comprobante = {
                cuie: efector ,
                fechaComprobante: moment().format('YYYYMMDD'),
                claveBeneficiario: afiliadoSumar[0].clavebeneficiario,
                idAfiliado: afiliadoSumar[0].id_smiafiliados,
                fechaCarga: moment().format('YYYYMMDD'),
                comentario: 'Carga Automática',
                marca: 0,
                periodo: await getPeriodo(),
                activo: 'S',
                idTipoPrestacion: 1
            }

            let pacienteSips = await mapeoPaciente(agenda[index].paciente.documento);

            let datosPaciente = {
                fechaNacimiento: pacienteSips.fechaNacimiento,
                sexo: (pacienteSips.idSexo === 3 ? 'M' : pacienteSips.idSexo === 2 ? 'F' : 1),
                edad: moment(agenda[index].fecha).diff(pacienteSips.fechaNacimiento, 'years')
            }
            let idComprobante = await creaComprobanteSumar(comprobante);
            console.log(idComprobante);

             let prestacion = await creaPrestaciones( agenda[index].tipoPrestacion,idComprobante,agenda[index].fecha,datosPaciente)


        } 
    }
}

export async function getAfiliadoSumar(documento) {

    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = "SELECT * FROM dbo.PN_smiafiliados WHERE afidni = @documento AND activo = 'S'";
    let resultado = await new sql.Request(poolAgendas)
        .input('documento', sql.VarChar(50), documento)
        .query(query);
    poolAgendas.close()
    resultado = resultado.recordset;

    return resultado;
}

// mapeo de los efectores
export async function mapeoEfector(idEfector) {
    let efectorMongo: any = await mapeoEfectorMongo(idEfector);

    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'SELECT * FROM dbo.Sys_efector WHERE cuie = @codigo';
    let resultado = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), efectorMongo.codigo.cuie)
        .query(query);
    poolAgendas.close()

    return resultado.recordset[0].cuie;
}

/* Se trae el efector de mongo por ObjectId*/
async function mapeoEfectorMongo(idEfector: any) {
    return new Promise((resolve, reject) => {
        organizacion.model.findById(idEfector).then(efector => {
            resolve(efector);
        })
    });
}

async function getPeriodo() {
    return new Promise((resolve, reject) => {
        let fecha = moment(new Date, 'YYYY/MM/DD');

        let año = fecha.format('YYYY');
        let mes = fecha.format('MM');

        let periodo = año + '/' + mes;

        resolve(periodo);
    });
}

async function creaComprobanteSumar(datosComprobante) {
    console.log("entre wacho")
    return new Promise(async (resolve, reject) => {
        let query = "INSERT INTO dbo.PN_comprobante ( cuie, id_factura, nombre_medico, fecha_comprobante, clavebeneficiario, id_smiafiliados, " +
            " fecha_carga, comentario, marca, periodo, activo, idTipoDePrestacion) values ( " +
            "'" + datosComprobante.cuie + "'," + null + "," + null + ",'" + datosComprobante.fechaComprobante + "'," + "'" + datosComprobante.claveBeneficiario + "'" +
            "," + datosComprobante.idAfiliado + ",'" + datosComprobante.fechaCarga + "','" + datosComprobante.comentario + "'," + datosComprobante.marca +
            ",'" + datosComprobante.periodo + "','" + datosComprobante.activo + "'," + datosComprobante.idTipoPrestacion + ")";

        let idComprobante = await executeQuery(query);
        resolve(idComprobante);
        // let codigo = crearCodigoComp(datosComprobante.cuie, fechaAgenda, datosComprobante.claveBeneficiario, datosPaciente.fechaNacimiento, datosPaciente.sexo, datosPaciente.edad, 'CT', 'C002', 'A98');
        // creaPrestaciones(prestacion, idComprobante, fechaAgenda, datosPaciente.fechaNacimiento, datosPaciente.sexo, datosPaciente.edad, codigo)
    });
}

function creaPrestaciones(prestacionEntrante, idComprobante, fechaPrestacion, datosPaciente) {
    let prestacion = {
        id: null,
        id_comprobante: idComprobante,
        id_nomenclador: null,
        cantidad: 1,
        codigo:"falta",
        sexo: datosPaciente.sexo,
        edad: datosPaciente.edad,
        fechaPrestacion: moment(fechaPrestacion).format('YYYY-MM-DD') ,
        anio: moment(fechaPrestacion).format('YYYY'),
        mes: moment(fechaPrestacion).format('MM'),
        dia: moment(fechaPrestacion).format('DD'),
        fechaNacimiento: moment(datosPaciente.fechaNacimiento).format('YYYY-MM-DD') ,
        precio_prestacion: null,
        id_anexo: 301,
        diagnostico: 'A97' //HARDDDDCOOODINGGG 
    }

    configuracionPrestaciones.find({
        'tipoPrestacion.conceptId': prestacionEntrante.conceptId
    }, {}, async function (err, data: any) {
        let nomenclador: any = await mapeoNomenclador(data[0].nomencladorSUMAR);
        prestacion.precio_prestacion = nomenclador.precio;
        prestacion.id_nomenclador = nomenclador.id;
    });


}

async function creaComprobanteSumar(datosComprobante) {

}


async function mapeoNomenclador(codigoNomenclador) {
    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'SELECT * FROM [dbo].[PN_nomenclador] where id_nomenclador = @codigo';
    let resultado = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), 919) //919 HARDCOOOODIIIIINGGGG (id de consulta pediatrica de 1 a 6 años)
        .query(query);
    poolAgendas.close()

    let res = {
        id: resultado.recordset[0].id_nomenclador,
        precio: resultado.recordset[0].precio
    }
    return res;
}




export async function mapeoPaciente(dni) {
    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'SELECT TOP 1 * FROM dbo.Sys_Paciente where activo=1 and numeroDocumento=@dni order by objectId DESC;';
    let result = await new sql.Request(poolAgendas)
        .input('dni', sql.VarChar(50), dni)
        .query(query);
    poolAgendas.close()
    return result.recordset[0] ? result.recordset[0] : null;
}

export function crearCodigoComp(cuie, fechaPrestacion: Date, claveB, fechaNac: Date, sexo, año, grupo, codigo, diagnostico) {

    let fechaPrestParseada = moment(fechaPrestacion).format('YYYY') + '' + moment(fechaPrestacion).format('MM') + '' + moment(fechaPrestacion).format('DD');
    let fechaNacParseada = moment(fechaNac).format('YYYY') + '' + moment(fechaNac).format('MM') + '' + moment(fechaNac).format('DD');
    let codigoFinal = cuie + fechaPrestParseada + claveB + sexo + fechaNacParseada + año + grupo + codigo + diagnostico + 'P99';
    return codigoFinal;
}

async function executeQuery(query: any) {
    try {
        query += ' select SCOPE_IDENTITY() as id';
        poolAgendas = await new sql.ConnectionPool(config).connect();
        let result = await new sql.Request(poolAgendas).query(query);
        if (result && result.recordset) {
            return result.recordset[0].id;
        }
    } catch (err) {
        return (err);
    }
}
