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
const pLimit = require('p-limit');
import moment = require('moment');

const safe = (s: string) =>
    (s || '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-') // al parecer inválidos windows/zip
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150);

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
                ?.filter(item => item.entidad === 'ANDES' && item.valor?.length)
                ?.map(item => item.valor);
            const idsPaciente = vinculacionesPaciente?.length ? [...vinculacionesPaciente, peticionExport.pacienteId] : [peticionExport.pacienteId];
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
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('warning', (w) => {
            exportHudsLog.error('warning creando archivo .zip', {}, w);
        });

        const filename = `HUDS-${safe(peticionExport.pacienteNombre || '')}-${fecha}`;
        const objectLog = {
            usuario: peticionExport.user.usuario,
            huds: filename,
            organizacion: peticionExport.user.organizacion
        };
        const HudsFiles = getHUDSExportarModel();

        // stream real para esperar finish/close
        const ws = HudsFiles.createWriteStream({
            filename,
            contentType: 'application/zip',
            metadata: { user: peticionExport.user }
        });

        ws.on('error', reject);
        archive.pipe(ws);

        const stored = new Promise<any>((res, rej) => {
            ws.on('finish', () => res(null));
            ws.on('close', (file) => res(file));
            ws.on('error', rej);
        });

        const limit = pLimit(2);

        const getData = () => Promise.all(prestaciones.map((prestacion: any) =>
            limit(async () => {
                try {
                    const informe = new InformeRUP(prestacion.id, null, peticionExport.user);
                    const pdfBuffer: Buffer = await informe.informe();
                    const nombreArchivo = peticionExport.prestaciones.length
                        ? prestacion.paciente.documento
                        : prestacion.solicitud.tipoPrestacion.term;

                    const fechaArchivo = moment(prestacion.solicitud.fecha).format('YYYY-MM-DD-HHmmss');

                    archive.append(pdfBuffer, { name: `${fechaArchivo} - ${safe(nombreArchivo)}.pdf` });
                } catch (error) {
                    exportHudsLog.error('Crear pdf', { prestacion: prestacion?.id, ...objectLog }, error);
                }
            })
        ));

        const getCdas = (excluye: string[]) => Promise.all(cdas.map((cda: any) =>
            limit(async () => {
                try {
                    if (excluye.includes(cda.metadata.prestacion?.snomed?.conceptId)) { return; }

                    const fechaArchivo = moment(cda.metadata.fecha).format('YYYY-MM-DD-HHmmss');
                    const nombreArchivo = cda.metadata.prestacion?.snomed?.term || 'CDA';

                    if (cda.metadata.adjuntos?.length > 0) {
                        const realName = cda.metadata.adjuntos[0].id;
                        const fileCda = await getCdaAdjunto(cda, realName);

                        archive.append(fileCda.stream, { name: `${fechaArchivo} - ${safe(nombreArchivo)}.pdf` });
                        return;
                    }

                    if (cda.metadata.prestacion && cda.metadata.prestacion.snomed.conceptId !== '33879002') {
                        const cdaData: any = await cdaToJSON(cda._id);
                        const codificacionCDA = cdaData.ClinicalDocument.component.structuredBody.component.section;
                        cda.metadata['codificacion'] = codificacionCDA;

                        const informe = new InformeCDA(cda.metadata, peticionExport.usuario);

                        const pdfBuffer: Buffer = await informe.informe(); // mismo cambio que InformeRUP
                        archive.append(pdfBuffer, { name: `${fechaArchivo} - ${safe(nombreArchivo)}.pdf` });
                    }
                } catch (error) {
                    exportHudsLog.error('Crear cda', { cda: cda?._id, ...objectLog }, error);
                }
            })
        ));

        try {
            if (prestaciones?.length) { await getData(); }
            if (cdas?.length) { await getCdas(peticionExport.excluye || []); }

            await archive.finalize();
            const fileDoc = await stored;

            peticionExport.idHudsFiles = fileDoc?._id || ws.id;
            peticionExport.status = 'completed';
            peticionExport.updatedAt = new Date();
            await peticionExport.save();

            resolve(null);
        } catch (e) {
            reject(e);
        }
    });


}
