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
    const peticionExport: any = await ExportHudsModel.findById(idExportHuds);

    if (!peticionExport) {
        return;
    }

    try {
        await buildExportFile(peticionExport);
    } catch (error) {
        peticionExport.status = 'error';
        peticionExport.updatedAt = new Date();
        await peticionExport.save();

        exportHudsLog.error('Exportar HUDS', {
            usuario: peticionExport.user?.usuario,
            organizacion: peticionExport.user?.organizacion
        }, error);

        throw error;
    }
}

async function buildExportFile(peticionExport: any) {
    let fechaCondicion = null;
    let prestaciones: any[] = [];
    let cdas = [];

    if (peticionExport.prestaciones.length) {
        prestaciones = await Prestacion.find({
            _id: { $in: peticionExport.prestaciones }
        });
    } else {
        const paciente = await Paciente.findById(peticionExport.pacienteId);

        const vinculacionesPaciente = paciente.identificadores
            ?.filter(item => item.entidad === 'ANDES' && item.valor?.length)
            ?.map(item => item.valor);

        const idsPaciente = vinculacionesPaciente?.length
            ? [...vinculacionesPaciente, peticionExport.pacienteId]
            : [peticionExport.pacienteId];

        const query: any = {
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
            query['solicitud.tipoPrestacion.conceptId'] =
                peticionExport.tipoPrestacion;
        }

        prestaciones = await Prestacion.find(query);

        const queryCda: any = {
            'metadata.paciente': { $in: idsPaciente },
            'metadata.prestacion.snomed.conceptId': {
                $ne: '2881000013106'
            }
        };

        if (fechaCondicion) {
            queryCda['metadata.fecha'] = fechaCondicion;
        }

        const cdaFiles = makeFs();
        cdas = await cdaFiles.find(queryCda).toArray();
    }

    const fecha = moment(peticionExport.createdAt).format('YYYY-MM-DD');

    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    archive.on('warning', (warning) => {
        exportHudsLog.error('warning creando archivo .zip', {}, warning);
    });

    const metadata = {
        user: peticionExport.user
    };

    const options = {
        filename: `HUDS-${safe(peticionExport.pacienteNombre || '')}-${fecha}`,
        contentType: 'application/zip',
        metadata
    };

    const HudsFiles = getHUDSExportarModel();

    const objectLog = {
        usuario: peticionExport.user?.usuario,
        huds: options.filename,
        organizacion: peticionExport.user?.organizacion
    };

    const uploadStream = HudsFiles.openUploadStream(
        options.filename,
        {
            contentType: options.contentType,
            metadata: options.metadata
        }
    );

    const stored = new Promise<void>((resolve, reject) => {

        uploadStream.on('error', reject);
        uploadStream.on('finish', async () => {
            try {
                peticionExport.idHudsFiles = uploadStream.id;
                peticionExport.status = 'completed';
                peticionExport.updatedAt = new Date();

                await peticionExport.save();

                resolve();
            } catch (error) {
                reject(error);
            }
        });

        archive.on('error', reject);
    });

    archive.pipe(uploadStream);

    exportHudsLog.info('exportaHuds', objectLog);

    const limit = pLimit(2);

    const getData = () => {
        return Promise.all(
            prestaciones.map((prestacion: any) => limit(async () => {
                try {
                    const informe = new InformeRUP(
                        prestacion.id,
                        null,
                        peticionExport.user
                    );

                    const pdfBuffer: Buffer = await informe.informe();

                    const nombreArchivo = peticionExport.prestaciones.length
                        ? prestacion.paciente.documento
                        : prestacion.solicitud.tipoPrestacion.term;

                    const fechaArchivo = moment(
                        prestacion.solicitud.fecha
                    ).format('YYYY-MM-DD-HHmmss');

                    archive.append(pdfBuffer, {
                        name: `${fechaArchivo} - ${safe(nombreArchivo)}.pdf`
                    });

                } catch (error) {
                    exportHudsLog.error(
                        'Crear pdf',
                        objectLog,
                        error
                    );
                }
            }))
        );
    };

    const getCdas = (excluye: string[]) => {
        return Promise.all(
            cdas.map((cda: any) => limit(async () => {
                const conceptId = cda.metadata?.prestacion?.snomed?.conceptId;

                if (excluye.includes(conceptId)) {
                    return;
                }

                if (cda.metadata.adjuntos?.length > 0) {
                    const realName = cda.metadata.adjuntos[0].id;

                    try {
                        const fileCda = await getCdaAdjunto(
                            cda,
                            realName
                        );

                        if (!fileCda?.stream) {
                            return;
                        }

                        archive.append(fileCda.stream, {
                            name:
                                `${moment(cda.metadata.fecha)
                                    .format('YYYY-MM-DD-HHmmss')} - ` +
                                `${safe(cda.metadata.prestacion?.snomed?.term || 'CDA')}.pdf`
                        });
                    } catch (error) {
                        exportHudsLog.error(
                            'Crear cda',
                            objectLog,
                            error
                        );
                    }
                    return;
                }

                if (conceptId && conceptId !== '33879002') {
                    try {
                        const cdaData: any = await cdaToJSON(cda._id);

                        const codificacion = cdaData?.ClinicalDocument
                            ?.component?.structuredBody?.component?.section;

                        if (!codificacion) {
                            exportHudsLog.error(
                                'Crear informe cda',
                                objectLog,
                                new Error('CDA sin codificación')
                            );
                            return;
                        }

                        cda.metadata.codificacion = codificacion;

                        const informe = new InformeCDA(
                            cda.metadata,
                            peticionExport.user?.usuario
                        );

                        const pdfBuffer: Buffer = await informe.informe();

                        const fechaArchivo = moment(
                            cda.metadata.fecha
                        ).format('YYYY-MM-DD-HHmmss');

                        const nombreArchivo =
                            cda.metadata.prestacion.snomed.term;

                        archive.append(pdfBuffer, {
                            name:
                                `${fechaArchivo} - ` +
                                `${safe(nombreArchivo)}.pdf`
                        });

                    } catch (error) {
                        exportHudsLog.error(
                            'Crear informe cda',
                            objectLog,
                            error
                        );
                    }
                }
            }))
        );
    };

    try {
        await getData();
        await getCdas(peticionExport.excluye || []);
        await archive.finalize();
        await stored; // No marcamos "completed" hasta que GridFS haya terminado efectivamente de recibir y guardar el ZIP
    } catch (error) {
        (uploadStream as any).abort?.();
        throw error;
    }
}
