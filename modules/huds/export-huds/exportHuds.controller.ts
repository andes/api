import * as archiver from 'archiver';
import { cdaToJSON, getCdaAdjunto } from '../../../modules/cda/controller/CDAPatient';
import { makeFs } from '../../../modules/cda/schemas/CDAFiles';
import { InformeRUP } from '../../descargas/informe-rup/informe-rup';
import { InformeCDA } from '../../descargas/informe-cda/informe-cda';
import { Prestacion } from '../../rup/schemas/prestacion';
import { exportHudsLog } from './exportHuds.log';
import { ExportHudsModel } from './exportHuds.schema';
import { getHUDSExportarModel } from './hudsFiles';
import { Paciente } from '../../../core-v2/mpi';
import moment = require('moment');

export async function createFile(idExportHuds) {
    return new Promise(async (resolve, reject) => {
        const peticionExport: any = await ExportHudsModel.findById(idExportHuds);
        let fechaCondicion = null;
        let prestaciones: any[] = [];
        let cdas = [];
        if (peticionExport.prestaciones.length) {
            prestaciones = await Prestacion.find({ _id: { $in: peticionExport.prestaciones } });
        } else {
            // recuperamos las posibles vinculaciones del paciente para traer también todas las prestaciones asociadas a esas vinculaciones
            const paciente = await Paciente.findById(peticionExport.pacienteId);
            const vinculacionesPaciente = paciente.identificadores
                .filter(item => item.entidad === 'ANDES' && item.valor?.length)
                .map(item => item.valor);
            const idsPaciente = [...vinculacionesPaciente, peticionExport.pacienteId];
            const query = {
                'paciente.id': { $in: idsPaciente },
                'estadoActual.tipo': 'validada'
            };

            if (peticionExport.fechaDesde && peticionExport.fechaHasta) {
                fechaCondicion = {
                    $gte: moment(peticionExport.fechaDesde),
                    $lte: moment(peticionExport.fechaHasta)
                };
                query['ejecucion.fecha'] = fechaCondicion;
            }
            if (peticionExport.tipoPrestacion) {
                query['solicitud.tipoPrestacion.conceptId'] = peticionExport.tipoPrestacion;
            }
            prestaciones = await Prestacion.find(query);

            const queryCda = {
                'metadata.paciente': { $in: idsPaciente },
                'metadata.prestacion.snomed.conceptId': { $ne: '2881000013106' },
            };
            if (fechaCondicion) {
                queryCda['metadata.fecha'] = fechaCondicion;
            }
            const cdaFiles = makeFs();
            cdas = await cdaFiles.find(queryCda).toArray();
        }
        const fecha = moment(peticionExport.createAt).format('YYYY-MM-DD');

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        const metadata = {
            user: peticionExport.user
        };
        const options = {
            filename: `HUDS-${peticionExport.pacienteNombre ? peticionExport.pacienteNombre : ''}-${fecha}`,
            contentType: 'application/zip',
            metadata
        };
        const HudsFiles = getHUDSExportarModel();
        const objectLog = {
            usuario: peticionExport.user.usuario,
            huds: options.filename,
            organizacion: peticionExport.user.organizacion
        };
        try {
            HudsFiles.writeFile(
                options
                ,
                archive,
                (_error: any, archivo) => {
                    if (_error) {
                        return reject();
                    }
                    peticionExport.idHudsFiles = archivo._id;
                    peticionExport.status = 'completed';
                    peticionExport.updatedAt = new Date();
                    peticionExport.save();
                    return resolve(null);
                }
            );

            exportHudsLog.info('exportaHuds', objectLog);
        } catch (error) {
            throw error;
        }
        archive.on('error', (err) => {
            throw err;
        });
        const getData = () => {
            return Promise.all(prestaciones.map(async (prestacion: any) => {
                try {
                    const informe = new InformeRUP(prestacion.id, null, peticionExport.user);
                    const archivo = await informe.informe();
                    const nombreArchivo = peticionExport.prestaciones.length ? prestacion.paciente.documento : prestacion.solicitud.tipoPrestacion.term;
                    const fechaArchivo = moment(prestacion.solicitud.fecha).format('YYYY-MM-DD-hhmmss');
                    archive.file(`${archivo}`, { name: `${fechaArchivo} - ${nombreArchivo}.pdf` });
                } catch (error) {
                    exportHudsLog.error('Crear pdf', objectLog, error);
                }
            }));
        };
        const getCdas = (excluye: string[]) => {
            return Promise.all(cdas.map(async (cda: any) => {
                if (!excluye.includes(cda.metadata.prestacion?.snomed?.conceptId)) {
                    if (cda.metadata.adjuntos?.length > 0) {
                        const realName = cda.metadata.adjuntos[0].id;
                        try {
                            const fileCda = await getCdaAdjunto(cda, realName);
                            archive.append(fileCda.stream, { name: `${moment(cda.metadata.fecha).format('YYYY-MM-DD-hhmmss')} - ${cda.metadata.prestacion.snomed.term}.pdf` });

                        } catch (error) {
                            exportHudsLog.error('Crear cda', objectLog, error);
                        }
                    } else {
                        if (cda.metadata.prestacion && cda.metadata.prestacion.snomed.conceptId !== '33879002') {
                            try {
                                let codificacionCDA;
                                await cdaToJSON(cda._id).then(async (cdaData: any) => {
                                    codificacionCDA = cdaData.ClinicalDocument.component.structuredBody.component.section;
                                });
                                cda.metadata['codificacion'] = codificacionCDA;
                                const informe = new InformeCDA(cda.metadata, peticionExport.usuario);
                                const archivo: any = await informe.informe();
                                const fechaArchivo = moment(cda.metadata.fecha).format('YYYY-MM-DD-hhmmss');
                                const nombreArchivo = cda.metadata.prestacion.snomed.term;
                                archive.file(`${archivo}`, { name: `${fechaArchivo} - ${nombreArchivo}.pdf` });
                            } catch (error) {
                                exportHudsLog.error('Crear informe cda', objectLog, error);
                            }
                        }
                    }
                }
            }));
        };
        // Primero obtengo los pdf y luego cierro el archivo
        if (prestaciones) {
            await getData();
        }
        if (cdas) {
            await getCdas(peticionExport.excluye);
        }
        archive.finalize();
    });
}
