import { Prestacion } from '../../rup/schemas/prestacion';
import { getHUDSExportarModel } from './hudsFiles';
import { exportHudsLog } from './exportHuds.log';
import { ExportHudsModel } from './exportHuds.schema';
import * as archiver from 'archiver';
import { InformeRUP } from '../../descargas/informe-rup/informe-rup';

import moment = require('moment');

export async function createFile(idExportHuds) {
    return new Promise(async (resolve, reject) => {
        const peticionExport: any = await ExportHudsModel.findById(idExportHuds);
        let fechaCondicion = null;
        let prestaciones: any[] = [];
        if (peticionExport.prestaciones.length) {
            prestaciones = await Prestacion.find({ _id: { $in: peticionExport.prestaciones } });
        } else {
            let query = {
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
                    return resolve();
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
                    let informe = new InformeRUP(prestacion.id, null, peticionExport.user);
                    let archivo = await informe.informe();
                    const nombreArchivo = peticionExport.prestaciones.length ? prestacion.paciente.documento : prestacion.solicitud.tipoPrestacion.term;
                    const fechaArchivo = moment(prestacion.solicitud.fecha).format('YYYY-MM-DD');
                    archive.file(`${archivo}`, { name: `${fechaArchivo} - ${nombreArchivo}.pdf` });
                } catch (error) {
                    exportHudsLog.error('Crear pdf', objectLog, error);
                }
            }));
        };
        // Primero obtengo los pdf y luego cierro el archivo
        if (prestaciones) {
            getData().then(() => {
                archive.finalize().then();
            });
        } else { // Caso en el que no hay prestaciones, devuelvo el zip vacio
            archive.finalize().then();
        }
    });
}
