import { Body } from './../../../cda/controller/class/Body';
import { tipoPrestacion } from './../../../../core/tm/schemas/tipoPrestacion';
import { IID } from './../../../cda/controller/class/interfaces';
import { organizacionCache } from './../../../../core/tm/schemas/organizacionCache';
import { obraSocial } from './../../../obraSocial/schemas/obraSocial';
import { profesional } from './../../../../core/tm/schemas/profesional';
import * as pacienteCrtl from './../../../../core/mpi/controller/paciente';
// import { paciente } from './../../../../core/mpi/schemas/paciente';
import { ObjectId } from 'bson';
// Imports
import * as operacionesLegacy from './../../../legacy/controller/operations';
import * as mongoose from 'mongoose';
import {agendasCache} from '../../../legacy/schemas/agendasCache';
import * as organizacion from '../../../../core/tm/schemas/organizacion';
import * as moment from 'moment';
import * as configPrivate from '../../../../config.private';
import * as dbg from 'debug';
import * as sql from 'mssql';
import { map } from 'async';

const debug = dbg('integracion');

let transaction;
let poolAgendas;

let config = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database,
    connectionTimeout: 10000,
    requestTimeout: 45000
};

async function conectar () {
    if (!poolAgendas) {
        poolAgendas = await new sql.ConnectionPool(config).connect();
    }
}

export async function facturacionRF(turnos) {
    let orden = {
        idOrden: null,
        idEfector: null,
        numero: null,
        periodo: '0000/00', // en que se factura, se genera luego
        idServicio: null,
        idPaciente: null,
        idProfesional: null,
        fecha: null,
        fechaPractica: null,
        idTipoPractica: null, // revisar como lo relacionamos
        idObraSocial: null,
        nroAfiliado: null,
        observaciones: null, // diagnostico
        estado: null, // no se pasa
        idUsuarioRegistro: null,
        fechaRegistro: new Date(),
        idPrefactura: null,
        idFactura: null,
        baja: 0,
        codificaHIV: null,
        monto: null,
        numeroSiniestro: null,
        fechaSiniestro: null,
        facturaFueraConvenio: null,
        esInternacion: null,
        detalles: null,
    };
    conectar();
    turnos.forEach(async turnoRF => {

        let rfEfector = await mapeoEfector(turnoRF.efector.id);
        // let rfServicio = await mapeoServicio(element.servicio);
        // let rfServicio = await mapeoServicio(1);
        let idPacienteSips = await mapeoPaciente(turnoRF.paciente.documento);

        if (!idPacienteSips) {
            let resultadoBusquedaPaciente: any = await pacienteCrtl.buscarPaciente(turnoRF.paciente.id);
            let idNivelCentral = 127; // Por defecto seteamos como efector nivel central (ID 127)
            let pacienteSips = operacionesLegacy.pacienteSipsFactory(resultadoBusquedaPaciente.paciente, idNivelCentral);
            idPacienteSips = await operacionesLegacy.insertaPacienteSips(pacienteSips);
        }

        // let unProfesional: any = await findProfesionalById(turnoRF.profesionales[0]._id);
        // let rfProfesional = await mapeoProfesional(unProfesional.documento);
        // // let rfTipoPractica = await mapeoTipoPractica(element.bloques[0].turnos[0].tipoPrestacion.conceptId);
        // let rfTipoPractica = await mapeoTipoPractica(1);

        let rfObraSocial = (turnoRF.paciente.obraSocial && turnoRF.paciente.obraSocial.codigo) ? await mapeoObraSocial(turnoRF.paciente.obraSocial.codigo) : null;
        console.log(rfObraSocial);
        // rfObraSocial = rfObraSocial.recordset[0];

        // let rfDiagnostico = (turnoRF.diagnostico) ? await mapeoDiagnostico(turnoRF.diagnostico) : null;
        
        // crearOrden(orden, rfEfector, rfServicio, rfPaciente, rfProfesional, rfTipoPractica, rfObraSocial, rfDiagnostico);
    });
    // sql.close();
}

async function crearOrden(orden, rfEfector, rfServicio, rfPaciente , rfProfesional, rfTipoPractica, rfObraSocial, rfDiagnostico) {
    conectar();
    orden.idEfector = rfEfector.recordset[0].idEfector;
    orden.idServicio = rfServicio.recordset[0].idServicio;
    orden.detalles.push(await crearOdenDetalle(orden));
    sql.close();
    return guardarOrden(orden);
}

async function crearOdenDetalle(orden) {
    let ordenDetalle = {
        idOrdenDetalle: null,
        idOrden: null,
        idEfector: null,
        idNomenclador: null,
        descripcion: null,
        cantidad: null,
        valorUnidad: null,
        ajuste: null,
    };

    ordenDetalle.idOrden = orden.idOrden;
    ordenDetalle.idEfector = orden.idEfector;
    let nomenclador = await mapeoNomenclador('42.01.02');

    ordenDetalle.idNomenclador = nomenclador.idNomenclador;
    ordenDetalle.descripcion = nomenclador.descripcion;
    ordenDetalle.cantidad = 1;
    ordenDetalle.valorUnidad = nomenclador.valorUnidad;
    ordenDetalle.ajuste = 0;
}

async function guardarOrden(orden) {
    return orden;
}

export async function mapeoServicio(id) {
    let query = 'SELECT * FROM dbo.Sys_servicio WHERE idServicio = @id';
    let result = await new sql.Request(poolAgendas)
        .input('id', sql.VarChar(50), id)
        .query(query);
    return result;
}

export async function mapeoEfector(id) {

    let efectorMongo: any = await mapeoEfectorMongo(id);
    let query = 'SELECT * FROM dbo.Sys_efector WHERE codigoSisa = @codigo';
    let result = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), efectorMongo.codigo.sisa)
        .query(query);
    return result;
}

export async function mapeoPaciente(dni) {
    let query = 'SELECT TOP 1 idPaciente FROM dbo.Sys_Paciente where activo=1 and numeroDocumento=@dni order by objectId DESC;';
    let result = await new sql.Request(poolAgendas)
        .input('dni', sql.VarChar(50), dni)
        .query(query);
    return result.recordset[0] ? result.recordset[0].idPaciente : null;
}

export async function mapeoProfesional(dni) {
    let query = 'SELECT * FROM dbo.Sys_Profesional WHERE activo=1 AND numeroDocumento = @dni;';
    let result = await new sql.Request(poolAgendas)
        .input('dni', sql.VarChar(50), dni)
        .query(query);
    return result.recordset[0];
}

export async function mapeoTipoPractica(id) {
    let query = 'SELECT * FROM dbo.FAC_TipoPractica WHERE idTipoPractica = @id;';
    let result = await new sql.Request(poolAgendas)
        .input('id', sql.VarChar(50), id)
        .query(query);
    return result;
}

export async function mapeoObraSocial(codigoObraSocial) {
    let query = 'SELECT idObraSocial, cod_puco FROM dbo.Sys_ObraSocial WHERE cod_PUCO = @codigo;';
    let result = await new sql.Request(poolAgendas)
    .input('codigo', sql.VarChar(50),  codigoObraSocial)
    .query(query);
    return result.recordset[0];
}

export async function mapeoDiagnostico(codigo) {
    let query = 'SELECT * FROM dbo.Sys_CIE10 WHERE codigo = @codigo;';
    let result = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), codigo)
        .query(query);
    return result;
}

export async function mapeoNomenclador(codigo) {
    let query = 'SELECT TOP 1 * FROM dbo.FAC_Nomenclador WHERE codigo = @codigo;';
    let result = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), codigo)
        .query(query);
    return result;
}

async function mapeoEfectorMongo(idEfector: any) {
    return new Promise((resolve, reject) => {
        organizacion.model.findById(idEfector).then(efector => {
            resolve(efector);
        });
    });
}

async function findProfesionalById(idProfesional: any) {
    return new Promise((resolve, reject) => {
        profesional.findById(idProfesional).then(found => {
            resolve(found);
        });
    });
}

