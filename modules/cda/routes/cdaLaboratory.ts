import * as express from 'express';
import * as stream from 'stream';
import * as base64 from 'base64-stream';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as sql from 'mssql';

import * as configPrivate from '../../../config.private';
import {
    model as Organizaciones
} from '../../../core/tm/schemas/organizacion';
import {
    model as Cie10
} from '../../../core/term/schemas/cie10';
import {
    makeFs
} from '../schemas/CDAFiles';
import * as pacienteCtr from '../../../core/mpi/controller/paciente';
import * as cdaCtr from '../controller/CDAPatient';
import * as operations from '../../legacy/controller/operations';
import * as pdfGenerator from '../../../utils/pdfGenerator';

import {
    Auth
} from '../../../auth/auth.class';

let path = require('path');
let router = express.Router();
let pool;
let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};


// ATENCIÓN: SOLO PARA USAR A NIVEL DE INTEGRACIÓN!!!!

/* Dado un paciente, se genera todos los CDA de laboratorio que tenga en SIL Nivel Central
hacemos esto para luego llamarlo con algún robot en lugar de modificar el software SIL. */

router.post('/laboratorios', async(req: any, res, next) => {
    if (!Auth.check(req, 'cdaLaboratorio:post')) {
        return next(403);
    }
    try {
        let unPaciente = req.body.paciente;
        pool = await sql.connect(connection);
        let laboratoriosValidados: any [];
        laboratoriosValidados = await operations.getEncabezados(unPaciente.documento);
        if (laboratoriosValidados.length > 0) {
            laboratoriosValidados.forEach(async reg => {
                let details = await operations.getDetalles(reg.idProtocolo);
                let organizacion = await operations.organizacionBySisaCode(reg.efectorCodSisa);
                let paciente = await cdaCtr.findOrCreate(req, unPaciente, organizacion.id); // Si el paciente viene con ID está en ANDES/MPI en otro caso es un paciente externo.
                let fecha = reg.fecha;
                let profesional = {
                    nombre: reg.solicitante,
                    apellido: '' // Nombre y Apellido viene junto en los registros de laboratorio de SQL
                };
                let snomed = '4241000179101'; // informe de laboratorio (elemento de registro)
                let cie10Laboratorio = {
                    codigo: 'Z01.7', // Código CIE-10: Examen de Laboratorio
                    nombre: 'Examen de laboratorio'
                };
                let texto = 'Exámen de Laboratorio';
                let uniqueId = String(new mongoose.Types.ObjectId());
                let informePDF = await pdfGenerator.informeLaboratorio(paciente, organizacion, reg.idProtocolo, details);
                let fileData;
                if (informePDF) {
                    fileData = await cdaCtr.storePdfFile(informePDF);
                }
                let cda = cdaCtr.generateCDA(uniqueId, paciente, fecha, profesional, organizacion, snomed, cie10Laboratorio, texto, fileData);
                let metadata = {
                    paciente: paciente.id,
                    prestacion: snomed,
                    fecha: fecha,
                    adjuntos: [fileData.filename]
                };
                let obj = await cdaCtr.storeCDA(uniqueId, cda, metadata);
                res.json({
                    cda: uniqueId,
                    paciente: paciente.id
                });
            });
        }

    } catch (e) {
        next(e);
    }
});

export = router;
