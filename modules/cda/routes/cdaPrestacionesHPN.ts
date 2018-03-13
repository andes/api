import * as express from 'express';
import * as stream from 'stream';
import * as base64 from 'base64-stream';
import * as mongoose from 'mongoose';
import * as moment from 'moment';

import * as configPrivate from '../../../config.private';
import { model as Organizaciones } from '../../../core/tm/schemas/organizacion';
import { model as Cie10 } from '../../../core/term/schemas/cie10';
import { makeFs } from '../schemas/CDAFiles';
import * as pacienteCtr from '../../../core/mpi/controller/paciente';
import * as cdaCtr from '../controller/CDAPatient';
import * as prestaciones from '../controller/import-prestacionesHPN';
import * as pdfGenerator from '../../../utils/pdfGenerator';
import * as operations from '../../legacy/controller/operations';

import { Auth } from '../../../auth/auth.class';

import { paciente as Paciente, pacienteMpi as PacienteMPI} from '../../../core/mpi/schemas/paciente';

let path = require('path');
let router = express.Router();


/* Dado un paciente, se genera todos los CDA de prestaciones realizadas */

router.post('/prestaciones', async(req: any, res, next) => {
    // if (!Auth.check(req, 'cdaLaboratorio:post')) {
    //    return next(403);
    // }
    try {
        let unPaciente = req.body.paciente;
        let counter = 0;
        let list = [];
        let prestacionesValidadas: any;
        // llamar a ws HPN y traer las ecogrfias validadas
        prestacionesValidadas = await prestaciones.postPrestaciones(unPaciente.documento);
        if (prestacionesValidadas) {
           prestacionesValidadas.forEach(async p => {
               /* TODO verificar que el cda no exista en la bd
               *
               * AQUI
               */
               let details = {
                   id : p.Id,
                   fecha: moment(new Date(p.Fecha)).format('YYYY-MM-DD'),
                   protocolo: p.Protocolo,
                   tipoEstudio: p.TipoEstudio,
                   origenEfector: p.OrigenEfector,
                   origenMedico: p.OrigenMedico,
                   medicoPatologo: p.MedicoPatologo
               };
               // Como no viene en los ws del HPN hardcodeamos el código SISA correspondiente
               let organizacion = await operations.organizacionBySisaCode('10580352167033');
               let paciente = await cdaCtr.findOrCreate(req, unPaciente, organizacion);
               let profData = p.OrigenMedico ? p.OrigenMedico.split(',') : null;
               let profesional;
               if (profData) {
                   profesional = {
                        apellido: profData[0],
                        nombre: profData[1]
                   };
               } else {
                   profesional = profData;
               }

               // Códifica las prestaciones de HPN SNOMED y CIE10
               let snomed;
               let cie10;
               let texto;
               switch (p.tipoEstudio) {
                case 'Ecografía de Partes Blandas': {
                    snomed = '438527007';
                    // No tiene CIE10 el procedimiento
                    cie10 = {
                        codigo : '',
                        nombre: ''
                    };
                    texto = 'Ecografía de partes blandas';
                    break;
                 }
                 case 'Ecografía Cerebral': {
                     snomed = '15634001000119103';
                     // No tiene CIE10 el procedimiento
                    cie10 = {
                        codigo : '',
                        nombre: ''
                    };
                    texto = 'Ecografía de cerebro';
                    break;
                 }
                 case 'Ecografía musculoesquelética': {
                    snomed = '241507002';
                    // No tiene CIE10 el procedimiento
                   cie10 = {
                       codigo : '',
                       nombre: ''
                   };
                   texto = 'Ecografía musculoesquelética';
                   break;
                }
               }
               let uniqueId = String(new mongoose.Types.ObjectId());
               let response = await prestaciones.downloadFile(p.Id);
                let fileData: any = await cdaCtr.storeFile({
                stream: response,
                mimeType: 'application/pdf',
                extension: 'pdf',
                metadata: {
                        cdaId: uniqueId,
                        paciente: mongoose.Types.ObjectId(paciente.id)
                    }
                });
                let cda = cdaCtr.generateCDA(uniqueId, 'O', paciente, p.fecha, profesional, organizacion, snomed, cie10, texto, fileData);
                let metadata = {
                    paciente: paciente.id,
                    prestacion: snomed,
                    fecha: p.fecha,
                    adjuntos: [ fileData.data ]
                };
                let obj = await cdaCtr.storeCDA(uniqueId, cda, metadata);
                list.push({cda: uniqueId, protocolo: p.protocolo});
                counter = counter + 1;
                if (counter === prestacionesValidadas.length) {
                 res.json({
                     proceso: 'Finalizado',
                     lista: list
                 });
                }
           });
        }
    } catch (e) {
        next(e);
    }
});

export = router;
