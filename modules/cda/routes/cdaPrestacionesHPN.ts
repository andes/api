import * as express from 'express';
import * as mongoose from 'mongoose';
import * as cdaCtr from '../controller/CDAPatient';
import * as prestaciones from '../controller/import-prestacionesHPN';
import * as operations from '../../legacy/controller/operations';

const router = express.Router();


/* Dado un paciente, se genera todos los CDA de prestaciones realizadas */

router.post('/prestaciones', async (req: any, res, next) => {
    // if (!Auth.check(req, 'cdaPrestacionesHPN:post')) {
    //    return next(403);
    // }
    try {
        const unPaciente = req.body.paciente;
        let counter = 0;
        const list = [];
        let prestacionesValidadas: any;
        // Como no viene en los ws del HPN hardcodeamos el código SISA correspondiente
        const organizacion = await operations.organizacionBySisaCode('10580352167033');
        // llamar a ws HPN y traer las ecogrfias validadas
        prestacionesValidadas = await prestaciones.postPrestaciones(unPaciente.documento);
        if (prestacionesValidadas) {
            prestacionesValidadas.forEach(async p => {

                // Si ya lo pase no hacemos nada
                const existe = await cdaCtr.findByMetadata({
                    'metadata.extras.idPrestacion': p.Id,
                    'metadata.extras.idEfector': organizacion._id
                });

                if (existe.length <= 0) {
                    const paciente = await cdaCtr.findOrCreate(req, unPaciente, organizacion);
                    const profData = p.OrigenMedico ? p.OrigenMedico.split(',') : null;
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
                        case 'Ecografía de Partes Blandas':
                            {
                                snomed = '438527007';
                                // No tiene CIE10 el procedimiento
                                cie10 = null;
                                texto = 'Ecografía de partes blandas';
                                break;
                            }
                        case 'Ecografía Cerebral':
                            {
                                snomed = '15634001000119103';
                                // No tiene CIE10 el procedimiento
                                cie10 = null;
                                texto = 'Ecografía de cerebro';
                                break;
                            }
                        case 'Ecografía musculoesquelética':
                            {
                                snomed = '241507002';
                                // No tiene CIE10 el procedimiento
                                cie10 = null;
                                texto = 'Ecografía musculoesquelética';
                                break;
                            }
                    }
                    const prestacion = await cdaCtr.matchCode(snomed);

                    const uniqueId = String(new mongoose.Types.ObjectId());
                    const response = await prestaciones.downloadFile(p.Id);
                    const fileData: any = await cdaCtr.storeFile({
                        stream: response,
                        mimeType: 'application/pdf',
                        extension: 'pdf',
                        metadata: {
                            cdaId: mongoose.Types.ObjectId(uniqueId),
                            paciente: mongoose.Types.ObjectId(paciente.id)
                        }
                    });
                    const cda = await cdaCtr.generateCDA(uniqueId, 'N', paciente, p.fecha, profesional, organizacion, prestacion, cie10, texto, fileData);
                    const metadata = {
                        paciente: paciente.id,
                        prestacion: snomed,
                        fecha: p.fecha,
                        adjuntos: [{ path: fileData.data, id: fileData.id }],
                        extras: {
                            idPrestacion: p.Id,
                            idEfector: organizacion._id
                        }
                    };
                    await cdaCtr.storeCDA(uniqueId, cda, metadata);
                    list.push({
                        cda: uniqueId,
                        protocolo: p.protocolo
                    });
                }
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
