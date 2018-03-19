import * as configPrivate from '../../../config.private';
import * as config from '../../../config';
import * as cdaCtr from './CDAPatient';
import * as moment from 'moment';
import * as sql from 'mssql';
import { Matching } from '@andes/match';
import * as mongoose from 'mongoose';
import * as operations from '../../legacy/controller/operations';
import * as debug from 'debug';

import * as http from 'http';

let request = require('request');
let soap = require('soap');
let libxmljs = require('libxmljs');
let logger = debug('laboratorios');
let cota = 0.95;

let pool;
let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};
pool = sql.connect(connection);

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

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

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        http.get(url, function (response) {
            if (response.statusCode === 200) {
                return resolve(response);
            } else {
                return reject({error: 'sips-pdf', status: response.statusCode});
            }
        });
    });
}

function donwloadFileHeller(idProtocolo, year) {
    return new Promise((resolve, reject) => {
        http.get(configPrivate.wsSalud.hellerWS + 'idPet=' + idProtocolo + '&year='  + year, (response) => {
            return response.on('data', (buffer) => {
                let resp = buffer.toString();

                let regexp = /10.1.104.37\/resultados_omg\/([0-9\-\_]*).pdf/;
                let match = resp.match(regexp);
                if (match && match[1]) {
                    return downloadFile(configPrivate.wsSalud.hellerFS + match[1] + '.pdf').then((_resp) => {
                        return resolve(_resp);
                    }).catch(reject);
                } else {
                    return reject({error: 'heller-error'});
                }
            });
        });
    });
}

export async function importarDatos(paciente) {
    try {

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
            if (value >= cota && validado && details.recordset) {
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

                let pdfUrl;
                let response;
                if (String(lab.idEfector) === '221') {
                    response = await donwloadFileHeller(lab.idProtocolo, fecha.format('YYYY'));
                } else {
                    pdfUrl = configPrivate.wsSalud.host + configPrivate.wsSalud.getResultado + '?idProtocolo=' + lab.idProtocolo + '&idEfector=' + lab.idEfector;
                    response = await downloadFile(pdfUrl);
                }


                let fileData: any = await cdaCtr.storeFile({
                    stream: response,
                    mimeType: 'application/pdf',
                    extension: 'pdf',
                    metadata: {
                        cdaId: mongoose.Types.ObjectId(uniqueId),
                        paciente: mongoose.Types.ObjectId(paciente.id)
                    }
                });
                // }

                let cda = cdaCtr.generateCDA(uniqueId, (hiv ? 'R' : 'N') , paciente, fecha, profesional, organizacion, snomed, cie10Laboratorio, texto, fileData);
                let metadata = {
                    paciente: mongoose.Types.ObjectId(paciente.id),
                    prestacion: snomed,
                    fecha: fecha.toDate(),
                    adjuntos: [{ path: fileData.data, id: fileData.id }],
                    extras: {
                        idEfector: lab.idEfector,
                        idProtocolo: lab.idProtocolo
                    }
                };
                let obj = await cdaCtr.storeCDA(uniqueId, cda, metadata);
                await sleep(200);
            } else {
                // Ver que hacer si no matchea
                if (value < cota) {
                    logger('-----------------------------------');
                    logger(paciente.nombre, lab.nombre);
                    logger(paciente.apellido, lab.apellido);
                    logger(paciente.documento, lab.numeroDocumento);
                    logger(paciente.sexo, lab.sexo);
                    logger(paciente.fechaNacimiento, lab.fechaNacimiento);
                }

            }
        }
        return true;
    } catch (e) {
        logger('Error', e);
        if (e && e.error === 'sips-pdf') {
            return false;
        }
        return true;
    }
}
