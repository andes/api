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

async function conectar (){
    if (!poolAgendas){
        poolAgendas = await new sql.ConnectionPool(config).connect();
    }
}

export async function facturacionRF(turnos){
    let orden = {
        idOrden: null,
        idEfector: null,
        numero: 1,
        periodo: '0000/00', // en que se factura, se genera luego
        idServicio: null,
        idPaciente: null,
        idProfesional: null,
        fecha: new Date(),
        fechaPractica: new Date(),
        idTipoPractica: null, // revisar como lo relacionamos
        idObraSocial: 0,
        nroAfiliado: '',
        observaciones: null, // diagnostico
        estado: '', // no se pasa
        idUsuarioRegistro: 1,
        fechaRegistro: new Date(),
        idPrefactura: 0,
        idFactura: 0,
        baja: 0,
        codificaHIV: 0,
        monto: 0,
        numeroSiniestro: '',
        fechaSiniestro: new Date('1900-01-01'),
        facturaFueraConvenio: 0,
        esInternacion: 0,
        detalles: null,
    };
    conectar();
    turnos.forEach(async turnoRF => {

        let rfEfector = await mapeoEfector(turnoRF.efector.id);
        let rfServicio = await mapeoServicio(148);
        let idPacienteSips = await mapeoPaciente(turnoRF.paciente.documento);

        if (!idPacienteSips){
            let resultadoBusquedaPaciente: any = await pacienteCrtl.buscarPaciente(turnoRF.paciente.id);
            let idNivelCentral = 127; // Por defecto seteamos como efector nivel central (ID 127)
            let pacienteSips = operacionesLegacy.pacienteSipsFactory(resultadoBusquedaPaciente.paciente, idNivelCentral);
            idPacienteSips = await operacionesLegacy.insertaPacienteSips(pacienteSips);
        }

        let unProfesional: any = await profesional.findById(turnoRF.profesionales[0]._id);
        let rfProfesional = await mapeoProfesional(unProfesional.documento);
        let rfTipoPractica = await mapeoTipoPractica(1);
        let rfObraSocial = (turnoRF.paciente.obraSocial && turnoRF.paciente.obraSocial.codigo)? await mapeoObraSocial(turnoRF.paciente.obraSocial.codigo): null;

        let codificacion = turnoRF.diagnostico.codificaciones[0] ? turnoRF.diagnostico.codificaciones[0].codificacionProfesional.cie10 : null;
        // let rfDiagnostico = (codificacion) ? await mapeoDiagnostico(codificacion) : null;

        // crearOrden(orden, rfEfector, rfServicio, idPacienteSips, rfProfesional, rfTipoPractica, rfObraSocial, rfDiagnostico);
        crearOrden(orden, rfEfector, 148, idPacienteSips, rfProfesional, 1, rfObraSocial, codificacion);
    });
    // sql.close();
}

async function crearOrden(orden, rfEfector, rfServicio, rfPaciente , rfProfesional, rfTipoPractica, rfObraSocial, rfDiagnostico){
    conectar();
    orden.idEfector = rfEfector;
    orden.idServicio = rfServicio;
    orden.idPaciente = rfPaciente;
    orden.idProfesional = rfProfesional;
    orden.idTipoPractica = rfTipoPractica;
    orden.idObraSocial = rfObraSocial;
    orden.observaciones = rfDiagnostico;

    // orden.detalles.push(await crearOdenDetalle(orden));
    sql.close();
    return guardarOrden(orden);
}

async function crearOdenDetalle(orden){
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

async function guardarOrden(orden){
let query = 'INSERT INTO [dbo].[FAC_Orden]' +
                ' ([idEfector]' +
                ' ,[numero]' +
                ' ,[periodo]' +
                ' ,[idServicio]' +
                ' ,[idPaciente]' +
                ' ,[idProfesional]' +
                ' ,[fecha]' +
                ' ,[fechaPractica]' +
                ' ,[idTipoPractica]' +
                ' ,[idObraSocial]' +
                ' ,[nroAfiliado]' +
                ' ,[observaciones]' +
                ' ,[estado]' +
                ' ,[idUsuarioRegistro]' +
                ' ,[fechaRegistro]' +
                ' ,[idPrefactura]' +
                ' ,[idFactura]' +
                ' ,[baja]' +
                ' ,[codificaHIV]' +
                ' ,[monto]' +
                ' ,[numeroSiniestro]' +
                ' ,[fechaSiniestro]' +
                ' ,[facturaFueraConvenio] ' +
                ' ,[esInternacion])' +
            ' VALUES' +
                ' (@idEfector' +
                ' ,@numero' +
                ' ,@periodo' +
                ' ,@idServicio' +
                ' ,@idPaciente' +
                ' ,@idProfesional' +
                ' ,@fecha' +
                ' ,@fechaPractica' +
                ' ,@idTipoPractica' +
                ' ,@idObraSocial' +
                ' ,@nroAfiliado' +
                ' ,@observaciones' +
                ' ,@estado' +
                ' ,@idUsuarioRegistro' +
                ' ,@fechaRegistro' +
                ' ,@idPrefactura' +
                ' ,@idFactura' +
                ' ,@baja' +
                ' ,@codificaHIV' +
                ' ,@monto' +
                ' ,@numeroSiniestro' +
                ' ,@fechaSiniestro' +
                ' ,@facturaFueraConvenio ' +
                ' ,@esInternacion) ' +
            'SELECT SCOPE_IDENTITY() as ID';

    let result = await new sql.Request(poolAgendas)
        .input('idEfector', sql.Int, orden.idEfector)
        .input('numero', sql.Int, orden.numero)
        .input('periodo', sql.Char(10) , orden.periodo)
        .input('idServicio', sql.Int, orden.idServicio)
        .input('idPaciente', sql.Int, orden.idPaciente)
        .input('idProfesional', sql.Int, orden.idProfesional)
        .input('fecha', sql.DateTime, orden.fecha)
        .input('fechaPractica', sql.DateTime, orden.fechaPractica)
        .input('idTipoPractica', sql.Int, orden.idTipoPractica)
        .input('idObraSocial', sql.Int, orden.idObraSocial)
        .input('nroAfiliado', sql.VarChar(50), orden.nroAfiliado)
        .input('observaciones',  sql.VarChar(500), orden.observaciones)
        .input('estado', sql.Char(10), orden.estado)
        .input('idUsuarioRegistro', sql.Int, orden.idUsuarioRegistro)
        .input('fechaRegistro', sql.DateTime, orden.fechaRegistro)
        .input('idPrefactura', sql.Int, orden.idPrefactura)
        .input('idFactura', sql.Int, orden.idFactura)
        .input('baja', sql.Bit, orden.baja)
        .input('codificaHIV', sql.Bit, orden.codificaHIV)
        .input('monto', sql.Decimal(18, 2), orden.monto)
        .input('numeroSiniestro', sql.VarChar(50), orden.numeroSiniestro)
        .input('fechaSiniestro', sql.DateTime, orden.fechaSiniestro)
        .input('facturaFueraConvenio', sql.Bit, orden.facturaFueraConvenio)
        .input('esInternacion', sql.Bit, orden.esInternacion)
        .query(query);

        return result.recordset[0];


}

export async function mapeoServicio(id) {
    let query = 'SELECT idServicio FROM dbo.Sys_servicio WHERE idServicio = @id';
    let result = await new sql.Request(poolAgendas)
        .input('id', sql.VarChar(50), id)
        .query(query);
    return result.recordset[0];
}

export async function mapeoEfector(organizacionId) {

    let efectorMongo: any = await organizacion.model.findById(organizacionId);
    let query = 'SELECT idEfector FROM dbo.Sys_efector WHERE codigoSisa = @codigo';
    let result = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), efectorMongo.codigo.sisa)
        .query(query);
    return result.recordset[0] ? result.recordset[0].idEfector : null;
}

export async function mapeoPaciente(dni) {
    let query = 'SELECT TOP 1 idPaciente FROM dbo.Sys_Paciente where activo=1 and numeroDocumento=@dni order by objectId DESC;';
    let result = await new sql.Request(poolAgendas)
        .input('dni', sql.VarChar(50), dni)
        .query(query);
    return result.recordset[0] ? result.recordset[0].idPaciente : null;
}

export async function mapeoProfesional(dni) {
    let query = 'SELECT top 1 idProfesional FROM dbo.Sys_Profesional WHERE activo=1 AND numeroDocumento = @dni;';
    let result = await new sql.Request(poolAgendas)
        .input('dni', sql.VarChar(50), dni)
        .query(query);
    return result.recordset[0] ? result.recordset[0].idProfesional : 0;
}

export async function mapeoTipoPractica(id) {
    let query = 'SELECT idTipoPractica FROM dbo.FAC_TipoPractica WHERE idTipoPractica = @id;';
    let result = await new sql.Request(poolAgendas)
        .input('id', sql.VarChar(50), id)
        .query(query);
    return result.recordset[0];
}

export async function mapeoObraSocial(codigoObraSocial) {
    let query = 'SELECT idObraSocial, cod_puco FROM dbo.Sys_ObraSocial WHERE cod_PUCO = @codigo;';
    let result = await new sql.Request(poolAgendas)
    .input('codigo', sql.Int,  codigoObraSocial)
    .query(query);
    return result.recordset[0] ? result.recordset[0].idObraSocial : 0;
}

// export async function mapeoDiagnostico(codigo) {
//     let query = 'SELECT * FROM dbo.Sys_CIE10 WHERE codigo = @codigo;';
//     let result = await new sql.Request(poolAgendas)
//         .input('codigo', sql.VarChar(50), codigo)
//         .query(query);
//     return result.recordset[0];
// }

export async function mapeoNomenclador(codigo) {
    let query = 'SELECT TOP 1 * FROM dbo.FAC_Nomenclador WHERE codigo = @codigo;';
    let result = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), codigo)
        .query(query);
    return result;
}
