// Imports
import * as mongoose from 'mongoose';
import { agendasCache } from '../../../legacy/schemas/agendasCache';
import * as organizacion from '../../../../core/tm/schemas/organizacion';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as configPrivate from '../../../../config.private';
import * as dbg from 'debug';
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

/* IMPORTANTE!!!!!
TENER EN CUENTA QUE PARA FACTURAR EL PACIENTE TIENE QUE EXISTIR EN LA TABLA PN_SMIAFILIADOS Y QUE ESTAR ACTIVO*/
export async function facturacionSumar(agenda: any) {

    for (var index = 0; index < agenda.length; index++) {
        let afiliadoSumar = await getAfiliadoSumar(agenda[index].paciente.documento);

        if (afiliadoSumar.length > 0) {
            let comprobante = {
                cuie: await mapeoEfector(agenda[index].efector),
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
            creaComprobanteSumar(comprobante);
        } else {
            console.log("NOOOOOO Es paciente SUMAr afiliado")
        }
    }
}

async function getAfiliadoSumar(documento) {

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
async function mapeoEfector(idEfector) {
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
    return new Promise(async (resolve, reject) => {           

        let query = "INSERT INTO dbo.PN_comprobante ( cuie, id_factura, nombre_medico, fecha_comprobante, clavebeneficiario, id_smiafiliados, " +
          " fecha_carga, comentario, marca, periodo, activo, idTipoDePrestacion) values ( " +
          "'" + datosComprobante.cuie + "'," + null + "," + null + ",'" + datosComprobante.fechaComprobante + "'," + "'" + datosComprobante.claveBeneficiario + "'" +
          "," + datosComprobante.idAfiliado + ",'" + datosComprobante.fechaCarga + "','" + datosComprobante.comentario + "'," + datosComprobante.marca +
          ",'" + datosComprobante.periodo + "','" + datosComprobante.activo + "'," + datosComprobante.idTipoPrestacion + ")";

          let idComprobante = await executeQuery(query);
          console.log("Query: ", query)
          console.log("IdComprobante: ", idComprobante)
    });
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
