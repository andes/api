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
import { Readable } from 'stream';
import moment = require('moment');
import * as mongoose from 'mongoose';
const pLimit = require('p-limit');

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

export async function createFile(idExportHuds) {
    return new Promise(async (resolve, reject) => {
        const peticionExport: any = await ExportHudsModel.findById(idExportHuds);

        let fechaCondicion;
        let prestaciones: any[] = [];
        let cdas = [];

        const objectLog = {
            idExportHuds,
            peticionExport: peticionExport?._id,
            pacienteId: peticionExport?.pacienteId,
            user: peticionExport?.user
        };

        if (peticionExport.prestaciones.length) {
            prestaciones = await Prestacion.find({ _id: { $in: peticionExport.prestaciones } });
        } else {
            // recuperamos las posibles vinculaciones del paciente para traer también todas las prestaciones asociadas a ellas
            const paciente = await Paciente.findById(peticionExport.pacienteId);
            const vinculacionesPaciente = paciente?.identificadores
                ?.filter(item => item.entidad === 'ANDES' && item.valor?.length)
                ?.map(item => item.valor);
            const idsPaciente = vinculacionesPaciente?.length ? [...vinculacionesPaciente, peticionExport.pacienteId] : [peticionExport.pacienteId];
            const query = {
                'paciente.id': { $in: idsPaciente },
                'estadoActual.tipo': 'validada'
            };

            if (peticionExport.fechaDesde && peticionExport.fechaHasta) {
                fechaCondicion = {
                    $gte: moment(peticionExport.fechaDesde).toDate(),
                    $lte: moment(peticionExport.fechaHasta).toDate()
                };
                query['ejecucion.fecha'] = fechaCondicion;
            }
            if (peticionExport.tipoPrestacion) {
                query['solicitud.tipoPrestacion.conceptId'] = peticionExport.tipoPrestacion;
            }
            if (peticionExport.organizacion) {
                query['solicitud.organizacion.id'] = peticionExport.organizacion;
            }
            prestaciones = await Prestacion.find(query);

            // IMPORTANTE:
            // usamos ObjectID desde la conexión activa de mongoose/gridfs legacy ya que las instancias creadas
            // con bson/mongodb externos no matchean correctamente contra metadata.paciente en CDAFiles.
            const ObjectID = peticionExport.constructor.db.base.mongo.ObjectID;
            if (!ObjectID) {
                throw new Error('No se pudo obtener constructor ObjectID desde CDAFiles');
            }
            const idsPacienteObjectId = idsPaciente
                .map(id => id?.toString())
                .filter(id => ObjectID.isValid(id))
                .map(id => new ObjectID(id));

            const queryCda = {
                'metadata.paciente': { $in: idsPacienteObjectId },
                'metadata.prestacion.snomed.conceptId': { $ne: '2881000013106' }, // prestamo de carpeta
            };
            if (fechaCondicion) {
                queryCda['metadata.fecha'] = fechaCondicion;
            }
            if (peticionExport.organizacion) {
                queryCda['metadata.organizacion._id'] = new ObjectID(peticionExport.organizacion.toString());
            }
            const cdaFiles = makeFs();
            cdas = await cdaFiles.find(queryCda).toArray();
        }

        const hudsFiles = getHUDSExportarModel();
        const archive = archiver('zip', {
            zlib: { level: 3 } // nivel de compresión (0-9)
        });
        const ws = hudsFiles.createWriteStream({
            filename: `export-${peticionExport._id}.zip`,
            contentType: 'application/zip'
        });

        archive.pipe(ws);

        const stored = new Promise<void>((res, rej) => {
            ws.once('finish', () => res());
            ws.once('error', rej);
            archive.once('error', rej);
        });

        const limit = pLimit(4);

        const getData = async () => {
            const files = await Promise.all(prestaciones.map((prestacion: any) =>
                limit(async () => {
                    const informe = new InformeRUP(prestacion.id, null, peticionExport.user);
                    const pdfBuffer: Buffer = await informe.informe();
                    const nombreArchivo = peticionExport.prestaciones.length
                        ? prestacion.paciente.documento
                        : prestacion.solicitud.tipoPrestacion.term;

                    const fechaArchivo = moment(prestacion.solicitud.fecha).format('YYYY-MM-DD-HHmmss');
                    const file = {
                        buffer: Buffer.from(pdfBuffer),
                        name: `${fechaArchivo} - ${safe(nombreArchivo)}.pdf`
                    };

                    return file;
                })
            ));

            for (const file of files) {
                const source = Readable.from(file.buffer);
                archive.append(source, {
                    name: file.name
                });
            }
        };

        const getCdas = async (excluye: string[]) => {
            const files = await Promise.all(cdas.map((cda: any) =>
                limit(async () => {
                    try {
                        if (excluye.includes(cda.metadata?.prestacion?.snomed?.conceptId)) {
                            return null;
                        }
                        const fechaArchivo = moment(cda.metadata.fecha).format('YYYY-MM-DD-HHmmss');
                        const nombreArchivo = cda.metadata.prestacion?.snomed?.term || 'CDA';

                        if (cda.metadata.adjuntos?.length > 0) {
                            const realName = cda.metadata.adjuntos[0].id;
                            const fileCda = await getCdaAdjunto(cda, realName);
                            const cdaBuffer = await streamToBuffer(fileCda.stream);

                            if (!cdaBuffer?.length) {
                                throw new Error(`CDA adjunto vacío ${cda._id}`);
                            }
                            return {
                                buffer: Buffer.from(cdaBuffer),
                                name: `${fechaArchivo} - ${safe(nombreArchivo)}.pdf`
                            };
                        }

                        if (cda.metadata.prestacion && cda.metadata.prestacion.snomed.conceptId !== '33879002') { // vacunas
                            const cdaData: any = await cdaToJSON(cda._id);
                            const codificacionCDA = cdaData.ClinicalDocument.component.structuredBody.component.section;
                            cda.metadata['codificacion'] = codificacionCDA;

                            const informe = new InformeCDA(cda.metadata, peticionExport.usuario);
                            const pdfBuffer: Buffer = await informe.informe();

                            if (!pdfBuffer?.length) {
                                throw new Error(`PDF vacío para CDA ${cda._id}`);
                            }
                            return {
                                buffer: Buffer.from(pdfBuffer),
                                name: `${fechaArchivo} - ${safe(nombreArchivo)}.pdf`
                            };
                        }
                        return null;

                    } catch (error) {
                        exportHudsLog.error('Crear cda', { cda: cda?._id, ...objectLog }, error);
                        return null;
                    }
                })
            ));

            for (const file of files.filter(Boolean)) {
                archive.append(Readable.from(file.buffer), {
                    name: file.name
                });
            }
        };

        try {
            if (prestaciones?.length) {
                await getData();
            }
            if (cdas?.length) {
                await getCdas(peticionExport.excluye || []);
            }
            archive.finalize();
            await stored;

            peticionExport.idHudsFiles = ws.id.toString();
            peticionExport.status = 'completed';
            peticionExport.updatedAt = new Date();
            await peticionExport.save();

            resolve(null);
        } catch (e) {
            reject(e);
        }
    });
}

// Verifica si hay historial antes de generar el zip
export async function checkHistory(params) {
    const { pacienteId, fechaDesde, fechaHasta, tipoPrestacion, organizacion } = params;

    const paciente = await Paciente.findById(pacienteId);
    const vinculacionesPaciente = paciente?.identificadores
        ?.filter(item => item.entidad === 'ANDES' && item.valor?.length)
        ?.map(item => item.valor);
    const idsPaciente = vinculacionesPaciente?.length ? [...vinculacionesPaciente, pacienteId] : [pacienteId];

    const query: any = {
        'paciente.id': { $in: idsPaciente },
        'estadoActual.tipo': 'validada'
    };

    if (fechaDesde && fechaHasta) {
        query['ejecucion.fecha'] = {
            $gte: moment(fechaDesde).toDate(),
            $lte: moment(fechaHasta).toDate()
        };
    }
    if (tipoPrestacion) {
        query['solicitud.tipoPrestacion.conceptId'] = tipoPrestacion;
    }
    if (organizacion) {
        query['solicitud.organizacion.id'] = organizacion;
    }

    const countPrestaciones = await Prestacion.countDocuments(query);
    if (countPrestaciones > 0) {
        return true;
    }

    // Verifica CDA
    const ObjectID = mongoose.Types.ObjectId as any;
    const idsPacienteObjectId = idsPaciente
        .map(id => id?.toString())
        .filter(id => ObjectID.isValid(id))
        .map(id => new ObjectID(id));

    const queryCda: any = {
        'metadata.paciente': { $in: idsPacienteObjectId },
        'metadata.prestacion.snomed.conceptId': { $ne: '2881000013106' }, // prestamo de carpeta
    };

    if (fechaDesde && fechaHasta) {
        queryCda['metadata.fecha'] = {
            $gte: moment(fechaDesde).toDate(),
            $lte: moment(fechaHasta).toDate()
        };
    }
    if (organizacion) {
        queryCda['metadata.organizacion._id'] = new ObjectID(organizacion.toString());
    }

    const cdaFiles = makeFs();
    const countCdas = await cdaFiles.find(queryCda).count();

    return countCdas > 0;
}
