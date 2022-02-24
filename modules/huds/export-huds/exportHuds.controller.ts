import * as archiver from 'archiver';
import { getCdaAdjunto } from '../../../modules/cda/controller/CDAPatient';
import { makeFs } from '../../../modules/cda/schemas/CDAFiles';
import { InformeRUP } from '../../descargas/informe-rup/informe-rup';
import { Prestacion } from '../../rup/schemas/prestacion';
import { exportHudsLog } from './exportHuds.log';
import { ExportHudsModel } from './exportHuds.schema';
import { getHUDSExportarModel } from './hudsFiles';

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
            const query = {
                'paciente.id': peticionExport.pacienteId,
                'estadoActual.tipo': 'validada'
            };
            if (peticionExport.fechaDesde && peticionExport.fechaHasta) {
                fechaCondicion = {
                    $gte: moment(peticionExport.fechaDesde).startOf('day').toDate(),
                    $lte: moment(peticionExport.fechaHasta).endOf('day').toDate()
                };
                query['ejecucion.fecha'] = fechaCondicion;
            }
            if (peticionExport.tipoPrestacion) {
                query['solicitud.tipoPrestacion.conceptId'] = peticionExport.tipoPrestacion;
            }
            prestaciones = await Prestacion.find(query);

            const queryCda = {
                'metadata.paciente': peticionExport.pacienteId,
                'metadata.adjuntos': { $exists: true }
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
                    const fechaArchivo = moment(prestacion.solicitud.fecha).format('YYYY-MM-DD');
                    archive.file(`${archivo}`, { name: `${fechaArchivo} - ${nombreArchivo}.pdf` });
                } catch (error) {
                    exportHudsLog.error('Crear pdf', objectLog, error);
                }
            }));
        };
        const getCdas = () => {
            return Promise.all(cdas.map(async (cda: any) => {
                if (cda.metadata.adjuntos?.length > 0) {
                    const realName = cda.metadata.adjuntos[0].id;
                    try {
                        const fileCda = await getCdaAdjunto(cda, realName);
                        archive.append(fileCda.stream, { name: `${moment(cda.metadata.fecha).format('YYYY-MM-DD')} - ${cda.metadata.prestacion.snomed.term}.pdf` });

                    } catch (error) {
                        exportHudsLog.error('Crear cda', objectLog, error);
                    }
                }
            }));
        };
        // Primero obtengo los pdf y luego cierro el archivo
        if (prestaciones) {
            await getData();
        }
        if (cdas) {
            await getCdas();
        }
        archive.finalize();
    });
}
