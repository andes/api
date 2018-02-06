import * as configPrivate from '../../../config.private';
import * as config from '../../../config';
import * as cdaCtr from './CDAPatient';
import * as moment from 'moment';
import * as sql from 'mssql';
import { Matching } from '@andes/match';
import * as mongoose from 'mongoose';
import * as operations from '../../legacy/controller/operations';

let request = require('request');
let soap = require('soap');
let libxmljs = require('libxmljs');

function toJson(xml) {
    xml = xml.replace('<?xml version="1.0" encoding="utf-8"?>', '');
    xml = xml.replace('<string xmlns="http://www.saludneuquen.gov.ar/">', '');
    xml = xml.replace('</string>', '');
    return JSON.parse(xml);
}

function HttpGet(url) {
    return new Promise((resolve, reject) => {
        request(url, function (error, response, html) {
            if (error) {
                return reject(error);
            }
            return resolve({response, html});
        });
    });
}

/**
 * { Documento: 34292120,
    Apellidos: 'Garcia',
    Nombres: 'Silvina Gabriela',
    FechaNacimiento: '01/01/1900',
    Sexo: 'F',
    Efector: 'HOSPITAL PROVINCIAL NEUQUEN  "DR. EDUARDO CASTRO RENDON"',
    NumeroProtocolo: '543251',
    FechaProtocolo: '10/02/2017',
    idProtocolo: 596142,
    idEfector: 205 }
 */



function matchPaciente(pacMpi, pacLab) {
    let weights = config.mpi.weightsDefault;
    let pacDto = {
        documento: pacMpi.documento ? pacMpi.documento.toString() : '',
        nombre: pacMpi.nombre ? pacMpi.nombre : '',
        apellido: pacMpi.apellido ? pacMpi.apellido : '',
        fechaNacimiento: pacMpi.fechaNacimiento ? moment(new Date(pacMpi.fechaNacimiento)).format('YYYY-MM-DD') : '',
        sexo: pacMpi.sexo ? pacMpi.sexo : ''
    };
    let pacElastic = {
        documento: pacLab.numeroDocumento ? pacLab.numeroDocumento.toString() : '',
        nombre: pacLab.nombre ? pacLab.nombre : '',
        apellido: pacLab.apellido ? pacLab.apellido : '',
        fechaNacimiento: pacLab.fechaNacimiento ? moment(pacLab.fechaNacimiento, 'DD/MM/YYYY').format('YYYY-MM-DD') : '',
        sexo: (pacLab.sexo === 'F' ? 'femenino' : (pacLab.sexo === 'M' ? 'masculino' : ''))
    };
    let match = new Matching();
    return match.matchPersonas(pacElastic, pacDto, weights, config.algoritmo);
}

let pool;
let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};

export async function importarDatos(paciente) {
    try {
        pool = await sql.connect(connection);
        // let url = configPrivate.wsSalud.host + configPrivate.wsSalud.getPaciente + '?dni=' + paciente.documento;
        // let dataResponse: any = await HttpGet(url);
        // let laboratorios = toJson(dataResponse.html);

        let laboratorios: any;
        laboratorios = await operations.getEncabezados(paciente.documento);
        for (let lab of laboratorios.recordset) {


            // Si ya lo pase no hacemos nada
            let existe = await cdaCtr.findByMetadata({
                'metadata.extras.idEfector': lab.idEfector,
                'metadata.extras.idProtocolo': lab.idProtocolo
            });
            if (existe.length > 0) {
                continue;
            }

            let details: any = await operations.getDetalles(lab.idProtocolo, lab.idEfector);
            let organizacion = await operations.organizacionBySisaCode(lab.efectorCodSisa);

            let validado = true;
            let hiv = false;

            details.recordset.forEach(detail => {
                validado = validado && (detail.profesional_val !== '');
                hiv = hiv || /hiv|vih/i.test(detail.item);
            });

            let value = matchPaciente(paciente, lab);
            if (value > 0.95 && validado && details.recordset) {

                let pdfUrl = configPrivate.wsSalud.host + configPrivate.wsSalud.getResultado + '?idProtocolo=' + lab.idProtocolo + '&idEfector=' + lab.idEfector;

                let fecha = moment(lab.fecha, 'DD/MM/YYYY');
                let profesional = {
                    nombre: lab.solicitante,
                    apellido: '' // Nombre y Apellido viene junto en los registros de laboratorio de SQL
                };
                let snomed = '4241000179101'; // informe de laboratorio (elemento de registro)
                let cie10Laboratorio = {
                    codigo: 'Z01.7', // Código CIE-10: Examen de Laboratorio
                    nombre: 'Examen de laboratorio'
                };
                let texto = 'Exámen de Laboratorio';
                let uniqueId = String(new mongoose.Types.ObjectId());
                let fileData;
                // if (stream) {
                fileData = await cdaCtr.storeFile({
                    stream: request.get(pdfUrl),
                    mimeType: 'application/pdf',
                    extension: 'pdf'
                });
                // }
 
                let cda = cdaCtr.generateCDA(uniqueId, (hiv ? 'R' : 'N') , paciente, fecha, profesional, organizacion, snomed, cie10Laboratorio, texto, fileData);
                let metadata = {
                    paciente: mongoose.Types.ObjectId(paciente.id),
                    prestacion: snomed,
                    fecha: fecha,
                    adjuntos: [ fileData.data ],
                    extras: {
                        idEfector: lab.idEfector,
                        idProtocolo: lab.idProtocolo
                    }
                };
                let obj = await cdaCtr.storeCDA(uniqueId, cda, metadata);

            } else {
                // Ver que hacer si no matchea
            }
        }
    } catch (e) {
        console.log(e);
    }
}
