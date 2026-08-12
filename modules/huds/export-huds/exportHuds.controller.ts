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
    const peticionExport: any = await ExportHudsModel.findById(idExportHuds);

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

    const fecha = moment(peticionExport.createAt).format('YYYY-MM-DD');

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
        usuario: peticionExport.user.usuario,
        huds: options.filename,
        organizacion: peticionExport.user.organizacion
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
        return Promise.all(
            prestaciones.map(async (prestacion: any) => {
                try {
                    const informe = new InformeRUP(
                        prestacion.id,
                        null,
                        peticionExport.user
                    );

                    const archivo = await informe.informe();

                    const nombreArchivo = peticionExport.prestaciones.length
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
            })
        );
    };

    const getCdas = (excluye: string[]) => {
        return Promise.all(
            cdas.map(async (cda: any) => {
                if (excluye.includes(cda.metadata.prestacion?.snomed?.conceptId)
                ) {
                    return;
                }

                if (cda.metadata.adjuntos?.length > 0) {
                    const realName = cda.metadata.adjuntos[0].id;

                    try {
                        const fileCda = await getCdaAdjunto(
                            cda,
                            realName
                        );
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

                if (
                    cda.metadata.prestacion &&
                    cda.metadata.prestacion.snomed.conceptId !==
                    '33879002'
                ) {
                    try {
                        const cdaData: any = await cdaToJSON(cda._id);

                        cda.metadata.codificacion =
                            cdaData.ClinicalDocument
                                .component
                                .structuredBody
                                .component
                                .section;

                        const informe = new InformeCDA(
                            cda.metadata,
                            peticionExport.usuario
                        );

                        const archivo: any = await informe.informe();

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
            })
        );
    };

    await getData();
    await getCdas(peticionExport.excluye || []);
    await archive.finalize();
    await stored; // No marcamos "completed" hasta que GridFS haya terminado efectivamente de recibir y guardar el ZIP
}
