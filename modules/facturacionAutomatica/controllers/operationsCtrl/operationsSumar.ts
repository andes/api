// Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../../legacy/schemas/agendasCache';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as configPrivate from '../../../../config.private';
import * as dbg from 'debug';

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
    activo: null,
    id_beneficiarios: null,
    alta_comp: null,
    idTipoPrestacion: 1,
};


export async function completaComprobante() {



    let agenda = [{
        pacienteDni: '34292120',
        efector: 'Q03119'
    }, {
        pacienteDni: '51119848',
        efector: 'Q06391'
    }, {
        pacienteDni: '47849904',
        efector: 'Q06391'
    },{
        pacienteDni: '31760727',
        efector: 'Q06391'
    }

    ];

    for (var index = 0; index < agenda.length; index++) {
        console.log("paciente", index)
        await comprobaciones(agenda[index].pacienteDni, agenda[index].efector)




    }
    return comprobante;

}

// mapeo de los efectores
async function mapeoEfector(cuie) {
    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'SELECT * FROM dbo.Sys_efector WHERE cuie = @codigo';
    let resultado = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), cuie)
        .query(query);
    poolAgendas.close()
    return resultado.recordset[0].cuie;
}

async function mapeoPacientes(documento) {
    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'Select * from dbo.Sys_paciente WHERE numeroDocumento = @documento';
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


async function comprobaciones(documento, efector) {
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
                comprobante.cuie = await mapeoEfector(efector);
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
        console.log("no soy paciente")
    }
}