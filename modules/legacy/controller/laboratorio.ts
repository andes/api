import * as configPrivate from '../../../config.private';
import * as operations from './operations';
import * as sql from 'mssql';
import * as pdfGenerator from '../../../utils/pdfGenerator';
import * as cdaCtr from '../../cda/controller/CDAPatient';
import * as mongoose from 'mongoose';

const MongoClient = require('mongodb').MongoClient;
let async = require('async');
let pool;
let transaction;

let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};

export async function generarCDA(fecha: any) {
    return new Promise < Array < any >> (async function (resolve, reject) {
        try {
            console.log('entro');
            let laboratoriosValidados: any = [];
            pool = await sql.connect(connection);
            laboratoriosValidados = await operations.getEncabezados(fecha);
            // laboratoriosValidados.forEach(async reg => {
            let reg = laboratoriosValidados[0];
            let patient = {
                apellido: reg.apellido,
                nombre: reg.nombre,
                sexo: reg.sexo,
                documento: reg.numeroDocumento,
                fechaNacimiento: reg.fechaNacimiento
            };
            let organization = {
                codigoSisa: reg.efectorCodSisa,
                nombre: reg.efector
            };
            let protocolo = {
                id: reg.idProtocolo,
                fecha: reg.fecha,
                profesional: {
                    nombre: reg.solicitante,
                    apellido: ''
                }
            };
            let details = await operations.getDetalles(protocolo.id);
            let dtoInforme = {
                paciente: patient,
                organizacion: organization,
                detalles: details
            };
            console.log('antes de generar el informe ');
            let informePDF = await pdfGenerator.informeLaboratorio(dtoInforme);
            // Generar CDA para la prestación de laboratorio Fijamos los códigos ya que SIL no tiene clasificación.
            let snomed = '4241000179101'; // informe de laboratorio (elemento de registro)
            let cie10Laboratorio = 'Z01.7'; // Código CIE-10: Examen de Laboratorio
            let texto = 'Exámen de Laboratorio';
            // No envío el médico solicitante ya que está todo junto nombre y apellido
            let org = await operations.organizacionBySisaCode(organization.codigoSisa);
            let organizacion = {
                _id: org.id,
                nombre: org.nombre
            };
            let uniqueId = String(new mongoose.Types.ObjectId());

            let fileData;
            if (informePDF) {
                fileData = await cdaCtr.storeFile(informePDF);
            }
            let cda = cdaCtr.generateCDA(uniqueId, dtoInforme.paciente, protocolo.fecha, protocolo.profesional, organizacion, snomed, cie10Laboratorio, texto, informePDF);
            
            let metadata = {
                paciente: patient.documento,
                prestacion: snomed,
                fecha: protocolo.fecha,
                adjuntos: [ fileData.filename ]
            };
            let obj = await cdaCtr.storeCDA(uniqueId, cda, metadata);
    
            // });
            resolve();
        } catch (ex) {
            pool.close();
            reject(ex);
        }
    });
}