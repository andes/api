import * as express from 'express';
import * as mongoose from 'mongoose';
import * as sql from 'mssql';
import * as configPrivate from '../../../config.private';
import * as cdaCtr from '../controller/CDAPatient';
import * as operations from '../../legacy/controller/operations';
import * as pdfGenerator from '../../../utils/pdfGenerator';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();
const connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};

// router.get('/testing/migrar', async(req: any, res, next) => {
//     let skip = parseInt(req.query.skip, 0);
//     let limit = parseInt(req.query.limit, 0);
//     let _stream = PacienteMPI.find({}, {nombre: 1, apellido: 1, fechaNacimiento: 1, documento: 1, sexo: 1}).skip(skip).limit(limit);
//     _stream.then( async (pacientes: any[]) => {
//         for (let pac of pacientes) {
//             await labsImport.importarDatos(pac);
//         }
//         res.json({status: 'OK', });
//     });
// });

// ATENCIÓN: SOLO PARA USAR A NIVEL DE INTEGRACIÓN!!!!

/* Dado un paciente, se genera todos los CDA de laboratorio que tenga en SIL Nivel Central
hacemos esto para luego llamarlo con algún robot en lugar de modificar el software SIL. */

router.post('/laboratorios', async (req: any, res, next) => {
    if (!Auth.check(req, 'cdaLaboratorio:post')) {
        return next(403);
    }
    try {
        const unPaciente = req.body.paciente;
        await sql.connect(connection);
        let counter = 0;
        const list = [];
        let laboratoriosValidados: any[];
        laboratoriosValidados = await operations.getEncabezados(unPaciente.documento);
        laboratoriosValidados.forEach(async reg => {
            const noExisteCdaAsociado = await operations.noExistCDA(reg.idProtocolo, unPaciente.documento);
            if (noExisteCdaAsociado) {
                const details = await operations.getDetalles(reg.idProtocolo, reg.idEfector);
                const organizacion = await operations.organizacionBySisaCode(reg.efectorCodSisa);
                const paciente = await cdaCtr.findOrCreate(req, unPaciente, organizacion.id); // Si el paciente viene con ID está en ANDES/MPI en otro caso es un paciente externo.
                const fecha = reg.fecha;
                const profesional = {
                    nombre: reg.solicitante,
                    apellido: '' // Nombre y Apellido viene junto en los registros de laboratorio de SQL
                };
                const snomed = '4241000179101'; // informe de laboratorio (elemento de registro)
                const prestacion = await cdaCtr.matchCode(snomed);

                const cie10Laboratorio = {
                    codigo: 'Z01.7', // Código CIE-10: Examen de Laboratorio
                    nombre: 'Examen de laboratorio'
                };
                const texto = 'Exámen de Laboratorio';
                const uniqueId = String(new mongoose.Types.ObjectId());
                const informePDF = await pdfGenerator.informeLaboratorio(paciente, organizacion, reg, details);
                let fileData;
                if (informePDF) {
                    fileData = await cdaCtr.storePdfFile(informePDF);
                }
                const cda = cdaCtr.generateCDA(uniqueId, 'R', paciente, fecha, profesional, organizacion, prestacion, cie10Laboratorio, texto, fileData);
                const metadata = {
                    paciente: paciente.id,
                    prestacion: snomed,
                    fecha,
                    adjuntos: [{ path: fileData.data, id: fileData.id }]
                };
                await cdaCtr.storeCDA(uniqueId, cda, metadata);
                // Marcamos el protocolo (encabezado) como generado, asignando el uniqueId
                await operations.setMarkProtocol(reg.idProtocolo, unPaciente.documento, uniqueId);
                counter = counter + 1;
                list.push({cda: uniqueId, protocolo: reg.idProtocolo});
            } else {
                counter = counter + 1;
                list.push({cda: 'Ya existe', protocolo: reg.idProtocolo});
            }
            if (counter === laboratoriosValidados.length) {
                res.json({
                    proceso: 'Finalizado',
                    lista: list
                });
            }
        });
    } catch (e) {
        next(e);
    }
});

export = router;
