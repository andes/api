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

const MAX_TRIES = 3;
const EXPORT_TIMEOUT_MS = 1000 * 60 * 4; // 4 minutos por pedido (menor al timeout general del scheduler)
const PDF_CONCURRENCY_LIMIT = 5;

export function exportHuds(data, user) {
    const obj = new ExportHudsModel({
        fechaDesde: data.fechaDesde,
        fechaHasta: data.fechaHasta,
        pacienteId: data.pacienteId,
        pacienteNombre: data.pacienteNombre,
        createdAt: moment().toDate(),
        updatedAt: moment().toDate(),
        expiredAt: moment().add(2, 'd').toDate(),
        tries: 0,
        tipoPrestacion: data.tipoPrestacion,
        prestaciones: data.prestaciones,
        excluye: data.excluye,
        user
    });
    return obj.save();
}

export async function exportHudsPending(options: { onlyToday?: boolean } = {}) {
    const query: any = {
        status: 'pending'
    };

    if (options.onlyToday) {
        query.createdAt = {
            $gte: moment().startOf('day').toDate(),
            $lte: moment().endOf('day').toDate()
        };
    }

    const pendientes: any[] = await ExportHudsModel.find(query).sort({ tries: 1, createdAt: 1 });

    for (const peticion of pendientes) {
        try {
            await createFile(peticion._id);
        } catch (err) {
            // El error ya es registrado y actualizado en createFile; continuamos con el siguiente pedido
        }
    }
}

export async function createFile(idExportHuds) {
    const peticionExport: any = await ExportHudsModel.findById(idExportHuds);

    if (!peticionExport || peticionExport.status !== 'pending') {
        return;
    }

    const today = moment().toDate();
    const isExpired = peticionExport.expiredAt && today > peticionExport.expiredAt;
    const currentTries = peticionExport.tries || 0;

    if (isExpired || currentTries >= MAX_TRIES) {
        peticionExport.status = 'error';
        peticionExport.updatedAt = new Date();
        await peticionExport.save();

        exportHudsLog.error('Exportar HUDS', {
            idExportHuds: peticionExport._id,
            tries: currentTries,
            expiredAt: peticionExport.expiredAt,
            usuario: peticionExport.user?.usuario,
            organizacion: peticionExport.user?.organizacion
        }, new Error('Expirado o máximo de intentos alcanzado'));
        return;
    }

    // Incrementamos tries antes de procesar para que, si el proceso muere por OOM o kill del scheduler,
    // el intento quede contabilizado y no bloquee indefinidamente los siguientes pedidos de la cola.
    peticionExport.tries = currentTries + 1;
    peticionExport.updatedAt = new Date();
    await peticionExport.save();

    try {
        await withTimeout(
            buildExportFile(peticionExport),
            EXPORT_TIMEOUT_MS,
            `Timeout exportando HUDS (${idExportHuds})`
        );
    } catch (error) {
        peticionExport.status = 'error';
        peticionExport.updatedAt = new Date();
        await peticionExport.save();

        exportHudsLog.error('Exportar HUDS', {
            idExportHuds: peticionExport._id,
            tries: peticionExport.tries,
            usuario: peticionExport.user?.usuario,
            organizacion: peticionExport.user?.organizacion
        }, error);

        throw error;
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function runInBatches<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
    for (let i = 0; i < items.length; i += limit) {
        const batch = items.slice(i, i + limit);
        await Promise.all(batch.map(fn));
    }
}

async function buildExportFile(peticionExport: any) {
    let fechaCondicion = null;
    let prestaciones: any[] = [];
    let cdas = [];

    if (peticionExport.prestaciones?.length) {
        prestaciones = await Prestacion.find({
            _id: { $in: peticionExport.prestaciones }
        });
    } else {
        const paciente = await Paciente.findById(peticionExport.pacienteId);

        const vinculacionesPaciente = paciente?.identificadores
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

    const metadata = {
        user: peticionExport.user
    };

    const options = {
        filename: `HUDS-${peticionExport.pacienteNombre || ''}-${fecha}`,
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

    const getData = () => {
        return runInBatches(prestaciones, PDF_CONCURRENCY_LIMIT, async (prestacion: any) => {
            try {
                const informe = new InformeRUP(
                    prestacion.id,
                    null,
                    peticionExport.user
                );

                const archivo = await informe.informe();
                if (!archivo) {
                    return;
                }

                const nombreArchivo = peticionExport.prestaciones?.length
                    ? prestacion.paciente.documento
                    : prestacion.solicitud.tipoPrestacion.term;

                const fechaArchivo = moment(
                    prestacion.solicitud.fecha
                ).format('YYYY-MM-DD-hhmmss');

                archive.file(`${archivo}`, {
                    name: `${fechaArchivo} - ${nombreArchivo}.pdf`
                });

            } catch (error) {
                exportHudsLog.error(
                    'Crear pdf',
                    objectLog,
                    error
                );
            }
        });
    };

    const getCdas = (excluye: string[]) => {
        return runInBatches(cdas, PDF_CONCURRENCY_LIMIT, async (cda: any) => {
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

                    fileCda.stream.on('error', (streamErr) => {
                        exportHudsLog.error('Stream CDA adjunto', objectLog, streamErr);
                    });

                    archive.append(fileCda.stream, {
                        name:
                            `${moment(cda.metadata.fecha)
                                .format('YYYY-MM-DD-hhmmss')} - ` +
                            `${cda.metadata.prestacion.snomed.term}.pdf`
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

                    const archivo: any = await informe.informe();
                    if (!archivo) {
                        return;
                    }

                    const fechaArchivo = moment(
                        cda.metadata.fecha
                    ).format('YYYY-MM-DD-hhmmss');

                    const nombreArchivo =
                        cda.metadata.prestacion.snomed.term;

                    archive.file(`${archivo}`, {
                        name:
                            `${fechaArchivo} - ` +
                            `${nombreArchivo}.pdf`
                    });

                } catch (error) {
                    exportHudsLog.error(
                        'Crear informe cda',
                        objectLog,
                        error
                    );
                }
            }
        });
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
