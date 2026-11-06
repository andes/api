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
import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
import * as moment from 'moment';
import * as pLimit from 'p-limit';

// convierte un stream a Buffer
const streamToBuffer = (stream): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
};

const safe = (s: string) =>
    (s || '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-') // al parecer inválidos windows/zip
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150);

interface HistoryParams {
    pacienteId: string;
    fechaDesde?: string;
    fechaHasta?: string;
    tipoPrestacion?: string;
    organizacion?: any;
}

/**
 * @param pacienteId ID del paciente
 * @returns IDs del paciente y sus vinculaciones ANDES
 */
async function getPacienteIds(pacienteId: string) {
    const paciente = await Paciente.findById(pacienteId);
    const vinculacionesPaciente = paciente?.identificadores
        ?.filter(item => item.entidad === 'ANDES' && item.valor?.length)
        ?.map(item => String(item.valor));
    return vinculacionesPaciente?.length ? [...vinculacionesPaciente, pacienteId] : [pacienteId];
}

/**
 * @param params filtros de fecha, tipoPrestacion y organizacion
 * @param idsPaciente IDs del paciente y sus vinculaciones ANDES
 * @returns consulta para buscar prestaciones validadas
 */
const buildPrestacionesQuery = (params: Partial<HistoryParams>, idsPaciente: string[]) => {
    const query: any = {
        'paciente.id': { $in: idsPaciente },
        'estadoActual.tipo': 'validada'
    };

    if (params.fechaDesde && params.fechaHasta) {
        query['ejecucion.fecha'] = {
            $gte: moment(params.fechaDesde).toDate(),
            $lte: moment(params.fechaHasta).toDate()
        };
    }
    if (params.tipoPrestacion) {
        query['solicitud.tipoPrestacion.conceptId'] = params.tipoPrestacion;
    }
    if (params.organizacion) {
        query['solicitud.organizacion.id'] = params.organizacion;
    }

    return query;
};

/**
 * @param params filtros de fecha y organizacion
 * @param idsPacienteObjectId IDs del paciente y sus vinculaciones como ObjectId
 * @returns consulta para buscar CDAs, excluyendo préstamos de carpeta
 */
const buildCdaQuery = (params: Partial<HistoryParams>, idsPacienteObjectId: ObjectId[]) => {
    const queryCda: any = {
        'metadata.paciente': { $in: idsPacienteObjectId },
        'metadata.prestacion.snomed.conceptId': { $ne: '2881000013106' } // prestamo de carpeta
    };

    if (params.fechaDesde && params.fechaHasta) {
        queryCda['metadata.fecha'] = {
            $gte: moment(params.fechaDesde).toDate(),
            $lte: moment(params.fechaHasta).toDate()
        };
    }
    if (params.organizacion) {
        queryCda['metadata.organizacion._id'] = new ObjectId(params.organizacion.toString());
    }

    return queryCda;
};

/**
 * @param params filtros de paciente, fechas, tipoPrestacion y organizacion
 * @returns IDs y consultas de prestaciones y CDAs, junto con el bucket de CDAFiles
 */
async function getHudsSearchCriteria(params: any) {
    const idsPaciente = await getPacienteIds(params.pacienteId);
    const query = buildPrestacionesQuery(params, idsPaciente);

    const cdaFiles = makeFs();

    // Usamos el mismo driver que CDAFiles para construir los ObjectId.
    const idsPacienteObjectId = idsPaciente
        .map(id => String(id))
        .filter(id => ObjectId.isValid(id))
        .map(id => new ObjectId(id));

    const queryCda = buildCdaQuery(params, idsPacienteObjectId);

    return { idsPaciente, query, idsPacienteObjectId, queryCda, cdaFiles };
}

/**
 * @param idExportHuds ID de la solicitud en la colección exportHuds
 * @returns promesa que finaliza al procesar la solicitud de exportación
 */
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
    let prestaciones: any[] = [];
    let cdas = [];

    if (peticionExport.prestaciones.length) {
        prestaciones = await Prestacion.find({
            _id: { $in: peticionExport.prestaciones }
        });
    } else {
        const criteria = await getHudsSearchCriteria(peticionExport);
        prestaciones = await Prestacion.find(criteria.query);
        cdas = await criteria.cdaFiles.find(criteria.queryCda).toArray();
    }

    const fecha = moment(peticionExport.createdAt).format('YYYY-MM-DD');

    const archive = archiver('zip', {
        zlib: { level: 3 } // nivel de compresión (0-9)
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

    const limit = pLimit(4);

    const getData = async () => {
        const files = await Promise.all(
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

                    return {
                        buffer: Buffer.from(pdfBuffer),
                        name: `${fechaArchivo} - ${safe(nombreArchivo)}.pdf`
                    };

                } catch (error) {
                    exportHudsLog.error(
                        'Crear pdf',
                        objectLog,
                        error
                    );
                    return null;
                }
            }))
        );

        for (const file of files.filter(Boolean)) {
            archive.append(Readable.from(file.buffer), {
                name: file.name
            });
        }
    };

    const getCdas = async (excluye: string[]) => {
        const files = await Promise.all(
            cdas.map((cda: any) => limit(async () => {
                const conceptId = cda.metadata?.prestacion?.snomed?.conceptId;

                if (excluye.includes(conceptId)) {
                    return null;
                }

                if (cda.metadata.adjuntos?.length > 0) {
                    const realName = cda.metadata.adjuntos[0].id;

                    try {
                        const fileCda = await getCdaAdjunto(
                            cda,
                            realName
                        );

                        if (!fileCda?.stream) {
                            return null;
                        }

                        const cdaBuffer = await streamToBuffer(fileCda.stream);
                        if (!cdaBuffer?.length) {
                            throw new Error(`CDA adjunto vacío ${cda._id}`);
                        }

                        return {
                            buffer: Buffer.from(cdaBuffer),
                            name:
                                `${moment(cda.metadata.fecha)
                                    .format('YYYY-MM-DD-HHmmss')} - ` +
                                `${safe(cda.metadata.prestacion?.snomed?.term || 'CDA')}.pdf`
                        };
                    } catch (error) {
                        exportHudsLog.error(
                            'Crear cda',
                            objectLog,
                            error
                        );
                    }
                    return null;
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
                            return null;
                        }

                        cda.metadata.codificacion = codificacion;

                        const informe = new InformeCDA(
                            cda.metadata,
                            peticionExport.user?.usuario
                        );

                        const pdfBuffer: Buffer = await informe.informe();
                        if (!pdfBuffer?.length) {
                            throw new Error(`PDF vacío para CDA ${cda._id}`);
                        }

                        const fechaArchivo = moment(
                            cda.metadata.fecha
                        ).format('YYYY-MM-DD-HHmmss');

                        const nombreArchivo =
                            cda.metadata.prestacion.snomed.term;

                        return {
                            buffer: Buffer.from(pdfBuffer),
                            name:
                                `${fechaArchivo} - ` +
                                `${safe(nombreArchivo)}.pdf`
                        };

                    } catch (error) {
                        exportHudsLog.error(
                            'Crear informe cda',
                            objectLog,
                            error
                        );
                    }
                }
                return null;
            }))
        );

        for (const file of files.filter(Boolean)) {
            archive.append(Readable.from(file.buffer), {
                name: file.name
            });
        }
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

/**
 * @param params filtros para buscar prestaciones y CDAs
 * @returns true si existe al menos una prestación o un CDA para esos filtros
 */
export async function checkHistory(params) {
    const { query, queryCda, cdaFiles } = await getHudsSearchCriteria(params);

    const prestacionExists = await Prestacion.findOne(query).select({ _id: 1 }).lean();
    if (prestacionExists) {
        return true;
    }

    const cdaMatch = await cdaFiles.find(queryCda).limit(1).toArray();
    return cdaMatch.length > 0;
}
