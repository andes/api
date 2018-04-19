import { Body } from './../../../cda/controller/class/Body';
import { tipoPrestacion } from './../../../../core/tm/schemas/tipoPrestacion';
//import { agendas } from './agendas';
import { IID } from './../../../cda/controller/class/interfaces';
import { organizacionCache } from './../../../../core/tm/schemas/organizacionCache';
import { obraSocial } from './../../../obraSocial/schemas/obraSocial';
import { profesional } from './../../../../core/tm/schemas/profesional';
import { paciente } from './../../../../core/mpi/schemas/paciente';
import { ObjectId } from 'bson';
// Imports
import * as mongoose from 'mongoose';
import {agendasCache} from '../../../legacy/schemas/agendasCache';

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

export async function facturacionRF(agendas) {
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

    agendas.forEach(async element => {
        conectar();
        let rfEfector = await mapeoEfector(element.organizacion.codigo.sisa, poolAgendas);
        //let rfServicio = await mapeoServicio(element.servicio, poolAgendas);
        let rfServicio = await mapeoServicio(1, poolAgendas);
        let rfPaciente = await mapeoPaciente(element.bloques[0].turnos[0].paciente.documento, element.bloques[0].turnos[0].paciente.id, poolAgendas);
        let rfProfesional = await mapeoProfesional(element.profesionales[0].documento, element.profesionales[0]._id , poolAgendas);
        //let rfTipoPractica = await mapeoTipoPractica(element.bloques[0].turnos[0].tipoPrestacion.conceptId, poolAgendas);
        let rfTipoPractica = await mapeoTipoPractica(1, poolAgendas);
        //let rfObraSocial = await mapeoObraSocial(element.bloques[0].turnos[0].paciente.documento, poolAgendas);
        let rfObraSocial = await mapeoObraSocial(972102, poolAgendas);
        let rfDiagnostico = await mapeoDiagnostico(element.bloques[0].turnos[0].diagnostico, poolAgendas);

        crearOrden(poolAgendas, orden, rfEfector, rfServicio, rfPaciente, rfProfesional, rfTipoPractica, rfObraSocial, rfDiagnostico);
        sql.close()
    });
}

async function crearOrden(poolAgendas, orden, rfEfector, rfServicio, rfPaciente , rfProfesional, rfTipoPractica, rfObraSocial, rfDiagnostico) {
    //console.log(rfEfector);
    //console.log(rfServicio);
    //console.log(rfPaciente);
    //console.log(rfProfesional);
    // console.log(rfTipoPractica);
    // console.log(rfObraSocial);
    // console.log(rfDiagnostico);

    orden.idEfector = rfEfector.recordset[0].idEfector;
    orden.idServicio = rfServicio.recordset[0].idServicio;
    orden.detalles.push = await crearOdenDetalle(poolAgendas, orden);
    guardarOrden(poolAgendas, orden);
}

async function crearOdenDetalle(poolAgendas, orden) {
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
    let nomenclador = await mapeoNomenclador('42.01.02', poolAgendas);

    ordenDetalle.idNomenclador = nomenclador.idNomenclador;
    ordenDetalle.descripcion = nomenclador.descripcion;
    ordenDetalle.cantidad = 1;
    ordenDetalle.valorUnidad = nomenclador.valorUnidad;
    ordenDetalle.ajuste = 0;
}

async function guardarOrden(poolAgendas, orden) {
    return orden;
}

export async function mapeoServicio(id, poolAgendas) {
    let query = 'SELECT * FROM dbo.Sys_servicio WHERE idServicio = @id';
    let result = await new sql.Request(poolAgendas)
        .input('id', sql.VarChar(50), id)
        .query(query);
    return result;
}

export async function mapeoEfector(codigo, poolAgendas) {
    let query = 'SELECT * FROM dbo.Sys_efector WHERE codigoSisa = @codigo';
    let result = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), codigo)
        .query(query);
    return result;
}

export async function mapeoPaciente(dni, pacienteId, poolAgendas) {
    // let query = 'SELECT * FROM dbo.Sys_Paciente WHERE numeroDocumento = @dni';
    let query = 'SELECT * FROM dbo.Sys_Paciente where activo=1 and numeroDocumento=@dni or objectId=@objectId order by objectId DESC;';
    let result = await new sql.Request(poolAgendas)
        .input('dni', sql.VarChar(50), dni)
        .input('objectId', sql.VarChar(50), pacienteId)
        .query(query);
    return result;
}

export async function mapeoProfesional(dni, profesionalId, poolAgendas) {
    let query = 'SELECT * FROM dbo.Sys_Profesional WHERE activo=1 AND numeroDocumento = @dni;';
    let result = await new sql.Request(poolAgendas)
        .input('dni', sql.VarChar(50), dni)
        // .input('objectId', sql.VarChar(50), profesionalId)
        .query(query);
    return result;
}

export async function mapeoTipoPractica(id, poolAgendas) {
    let query = 'SELECT * FROM dbo.FAC_TipoPractica WHERE idTipoPractica = @id;';
    let result = await new sql.Request(poolAgendas)
        .input('id', sql.VarChar(50), id)
        .query(query);
    return result;
}

export async function mapeoObraSocial(id, poolAgendas) {
    let query = 'SELECT * FROM dbo.Sys_ObraSocial WHERE cod_PUCO = @id;';
    let result = await new sql.Request(poolAgendas)
        .input('id', sql.VarChar(50), id)
        .query(query);
    return result;
}

export async function mapeoDiagnostico(codigo, poolAgendas) {
    let query = 'SELECT * FROM dbo.Sys_CIE10 WHERE codigo = @codigo;';
    let result = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), codigo)
        .query(query);
    return result;
}

export async function mapeoNomenclador(codigo, poolAgendas) {
    let query = 'SELECT TOP 1 * FROM dbo.FAC_Nomenclador WHERE codigo = @codigo;';
    let result = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), codigo)
        .query(query);
    return result;
}
