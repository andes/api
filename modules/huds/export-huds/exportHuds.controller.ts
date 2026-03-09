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
import * as mongoose from 'mongoose';
const pLimit = require('p-limit');
import moment = require('moment');

const safe = (s: string) =>
    (s || '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-') // al parecer inválidos windows/zip
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150);

async function buildHistoryQuery(params: { pacienteId; fechaDesde?; fechaHasta?; tipoPrestacion?; organizacion? }) {
    const { pacienteId, fechaDesde, fechaHasta, tipoPrestacion, organizacion } = params;

    const paciente = await Paciente.findById(pacienteId);
    const vinculacionesPaciente = paciente?.identificadores
        ?.filter(item => item.entidad === 'ANDES' && item.valor?.length)
        ?.map(item => item.valor);
    const idsPaciente = vinculacionesPaciente?.length ? [...vinculacionesPaciente, pacienteId] : [pacienteId];

    let fechaCondicion;
    if (fechaDesde && fechaHasta) {
        fechaCondicion = {
            $gte: moment(fechaDesde).toDate(),
            $lte: moment(fechaHasta).toDate()
        };
    }

    const prestacionQuery: any = {
        'paciente.id': { $in: idsPaciente },
        'estadoActual.tipo': 'validada'
    };
    if (fechaCondicion) {
        prestacionQuery['ejecucion.fecha'] = fechaCondicion;
    }
    if (tipoPrestacion) {
        prestacionQuery['solicitud.tipoPrestacion.conceptId'] = tipoPrestacion;
    }
    if (organizacion) {
        prestacionQuery['solicitud.organizacion.id'] = organizacion;
    }

    const cdaFiles = makeFs();
    // IMPORTANTE:
    // usamos ObjectID desde la conexión activa de mongoose/gridfs legacy ya que las instancias creadas
    // con bson/mongodb externos no matchean correctamente contra metadata.paciente en CDAFiles.
    const ObjectID = cdaFiles?.constructor?.db?.base?.mongo?.ObjectID || mongoose.Types.ObjectId;
    if (!ObjectID || typeof ObjectID.isValid !== 'function') {
        throw new Error('No se pudo obtener constructor ObjectID desde CDAFiles');
    }
    const idsPacienteObjectId = idsPaciente
        .map(id => id?.toString())
        .filter(id => ObjectID.isValid(id))
        .map(id => new ObjectID(id));

    const cdaQuery: any = {
        'metadata.paciente': { $in: idsPacienteObjectId },
        'metadata.prestacion.snomed.conceptId': { $ne: '2881000013106' },
    };
    if (fechaCondicion) {
        cdaQuery['metadata.fecha'] = fechaCondicion;
    }
    if (organizacion) {
        cdaQuery['metadata.organizacion._id'] = new ObjectID(organizacion.toString());
    }

    return { prestacionQuery, cdaQuery, cdaFiles };
}

export async function createFile(idExportHuds) {
    return new Promise(async (resolve, reject) => {
        const peticionExport: any = await ExportHudsModel.findById(idExportHuds);

        let prestaciones: any[] = [];
        let cdas = [];
        let cdaFilesBucket;

        if (peticionExport.prestaciones.length) {
            prestaciones = await Prestacion.find({ _id: { $in: peticionExport.prestaciones } });
            cdaFilesBucket = makeFs();
        } else {
            const { prestacionQuery, cdaQuery, cdaFiles } = await buildHistoryQuery({
                pacienteId: peticionExport.pacienteId,
                fechaDesde: peticionExport.fechaDesde,
                fechaHasta: peticionExport.fechaHasta,
                tipoPrestacion: peticionExport.tipoPrestacion,
                organizacion: peticionExport.organizacion
            });

            prestaciones = await Prestacion.find(prestacionQuery);
            cdas = await cdaFiles.find(cdaQuery).toArray();
            cdaFilesBucket = cdaFiles;
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

                        const pdfBuffer: Buffer = await informe.informe();
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

// Verifica si hay historial antes de generar el zip
export async function checkHistory(params) {
    const { prestacionQuery, cdaQuery, cdaFiles } = await buildHistoryQuery(params);

    const prestacion = await Prestacion.findOne(prestacionQuery);
    if (prestacion) {
        return true;
    }

    const [cda] = await cdaFiles.find(cdaQuery).limit(1).toArray();
    return !!cda;
}
