import * as moment from 'moment';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { InformacionExportada } from '../core/log/schemas/logExportaInformacion';
import { sisa } from './../config.private';
import { handleHttpRequest } from '../utils/requestHandler';

const user = sisa.user_snvs;
const clave = sisa.password_snvs;
const urlSisa = sisa.url_snvs;

export async function exportSisa(done, horas) {
    const start = moment().subtract(horas, 'h').toDate();
    const end = moment().toDate();
    const pipelineNexos = [
        {
            $match: {
                'solicitud.fecha': {
                    $gte: start,
                    $lte: end
                },
                'estadoActual.tipo': 'validada',
                $or: [
                    {
                        'ejecucion.registros.concepto.conceptId': '711000246101'
                    },
                    {
                        'ejecucion.registros.registros.registros.concepto.conceptId': '711000246101'
                    }
                ]
            }
        },
        {
            $sort: {
                'solicitud.fecha': 1
            }
        },
        {
            $project: {
                paciente: {
                    idPaciente: '$paciente.id',
                    dni: '$paciente.documento',
                    sexo: '$paciente.sexo',
                    fechaNacimiento: '$paciente.fechaNacimiento'
                },
                ambito: '$solicitud.ambitoOrigen',
                fecha: '$solicitud.fecha',
                idEfector: '$solicitud.organizacion.id'
            }
        },
        {
            $group: {
                _id: '$paciente',
                primeraPrestacion: {
                    $first: '$$ROOT'
                }
            }
        },
        {
            $project: {
                _id: 0,
                idPaciente: '$_id.idPaciente',
                dni: '$_id.dni',
                sexo: '$_id.sexo',
                fechaNacimiento: '$_id.fechaNacimiento',
                fecha: '$primeraPrestacion.fecha',
                ambito: '$primeraPrestacion.ambito',
                idEfector: '$primeraPrestacion.idEfector'
            }
        },
        {
            $lookup: {
                from: 'organizacion',
                localField: 'idEfector',
                foreignField: '_id',
                as: 'organizacion'
            }
        },
        {
            $addFields: {
                organizacion: {
                    $arrayElemAt: [
                        '$organizacion',
                        0
                    ]
                }
            }
        },
        {
            $project: {
                tipo: 'nexo',
                idPaciente: '$idPaciente',
                dni: '$dni',
                sexo: '$sexo',
                fechaNacimiento: {
                    $dateToString: {
                        date: '$fechaNacimiento',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
                fecha: {
                    $dateToString: {
                        date: '$fecha',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
                ambito: '$ambito',
                idEfector: '$idEfector',
                CodigoSisa: '$organizacion.codigo.sisa',
                fechaCarga: {
                    $dateToString: {
                        date: '$fecha',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
            }
        }
    ];

    const pipelineAntigenos = [
        {
            $match: {
                'solicitud.fecha': {
                    $gte: new Date(start), $lte: new Date(end)
                },
                'estadoActual.tipo': 'validada',
                $or: [
                    {
                        'ejecucion.registros.concepto.conceptId': { $in: ['901000246101', '831000246104'] }
                    },
                    {
                        'ejecucion.registros.registros.registros.concepto.conceptId': { $in: ['901000246101', '831000246104'] }
                    }
                ]
            }
        },
        {
            $sort: {
                'solicitud.fecha': 1
            }
        },
        {
            $project: {
                paciente: {
                    idPaciente: '$paciente.id',
                    dni: '$paciente.documento',
                    sexo: '$paciente.sexo',
                    fechaNacimiento: '$paciente.fechaNacimiento'
                },
                fecha: '$solicitud.fecha',
                ambito: '$solicitud.ambitoOrigen',
                idEfector: '$solicitud.organizacion.id'
            }
        },
        {
            $group: {
                _id: '$paciente',
                primeraPrestacion: {
                    $first: '$$ROOT'
                }
            }
        },
        {
            $project: {
                _id: 0,
                idPaciente: '$_id.idPaciente',
                dni: '$_id.dni',
                sexo: '$_id.sexo',
                fechaNacimiento: '$_id.fechaNacimiento',
                ambito: '$primeraPrestacion.ambito',
                fecha: '$primeraPrestacion.fecha',
                idEfector: '$primeraPrestacion.idEfector'
            }
        },
        {
            $lookup: {
                from: 'organizacion',
                localField: 'idEfector',
                foreignField: '_id',
                as: 'organizacion'
            }
        },
        {
            $addFields: {
                organizacion: {
                    $arrayElemAt: [
                        '$organizacion',
                        0
                    ]
                }
            }
        },
        {
            $project: {
                tipo: 'antigeno',
                idPaciente: '$idPaciente',
                dni: '$dni',
                sexo: '$sexo',
                fechaNacimiento: {
                    $dateToString: {
                        date: '$fechaNacimiento',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
                fecha: {
                    $dateToString: {
                        date: '$fecha',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
                ambito: '$ambito',
                idEfector: '$idEfector',
                CodigoSisa: '$organizacion.codigo.sisa',
                fechaCarga: {
                    $dateToString: {
                        date: '$fecha',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
            }
        }
    ];

    const prestacionesNexo = await Prestacion.aggregate(pipelineNexos);
    const prestacionesAntigenos = await Prestacion.aggregate(pipelineAntigenos);
    const prestaciones = [...prestacionesNexo, ...prestacionesAntigenos];

    for (const unaPrestacion of prestaciones) {
        const eventoNominal = {
            idTipodoc: '1',
            nrodoc: unaPrestacion.dni.toString(),
            sexo: unaPrestacion.sexo === 'femenino' ? 'F' : (unaPrestacion.sexo === 'masculino') ? 'M' : '',
            fechaNacimiento: unaPrestacion.fechaNacimiento,
            idGrupoEvento: '113',
            idEvento: unaPrestacion.ambito === 'ambulatorio' ? '321' : '322',
            idEstablecimientoCarga: unaPrestacion.CodigoSisa.toString(),
            fechaPapel: unaPrestacion.fecha,
            idClasificacionManualCaso: unaPrestacion.tipo === 'nexo' ? '792' : unaPrestacion.tipo === 'antigeno' ? '820' : ''
        };

        const dto = {
            usuario: user,
            clave,
            altaEventoCasoNominal: eventoNominal
        };
        const log = {
            fecha: new Date(),
            sistema: 'Sisa',
            key: unaPrestacion.tipo === 'nexo' ? 'sisa_nexos' : unaPrestacion.tipo === 'antigeno' ? 'sisa_antigenos' : '',
            idPaciente: unaPrestacion.idPaciente,
            info_enviada: eventoNominal,
            resultado: {}
        };
        try {
            const options = {
                uri: urlSisa,
                method: 'POST',
                body: dto,
                headers: {
                    APP_ID: sisa.APP_ID_ALTA,
                    APP_KEY: sisa.APP_KEY_ALTA,
                    'Content-Type': 'application/json'
                },
                json: true,
            };
            const [status, resJson] = await handleHttpRequest(options);

            if (status >= 200 && status <= 299) {
                log.resultado = {
                    resultado: resJson.resultado ? resJson.resultado : '',
                    id_caso: resJson.id_caso ? resJson.id_caso : '',
                    description: resJson.description ? resJson.description : ''
                };

            } else {
                log.resultado = {
                    resultado: 'ERROR_DE_ENVIO',
                    id_caso: '',
                    description: 'No se recibió ningún resultado'
                };
            }
            const info = new InformacionExportada(log);
            await info.save();

        } catch (error) {
            log.resultado = {
                resultado: 'ERROR_DE_ENVIO',
                id_caso: '',
                description: error.toString()
            };
            const info = new InformacionExportada(log);
            await info.save();
        }

    }
    done();
}
