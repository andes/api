import * as moment from 'moment';
import { InformacionExportada } from '../core/log/schemas/logExportaInformacion';
import { FormsEpidemiologia } from '../modules/forms/forms-epidemiologia/forms-epidemiologia-schema';
import { handleHttpRequest } from '../utils/requestHandler';
import { sisa } from './../config.private';
import { SECCION_CLASIFICACION } from '../modules/forms/forms-epidemiologia/constantes';

const user = sisa.user_snvs;
const clave = sisa.password_snvs;
const urlSisa = sisa.url_snvs;

export async function exportSisaFicha(done, horas, desde, hasta) {
    const start = desde ? moment(desde).toDate() : moment().subtract(horas, 'h').toDate();
    const end = hasta ? moment(hasta).toDate() : moment().toDate();
    const pipelineConfirmados = [
        {
            $match: {
                createdAt: {
                    $gte: start,
                    $lte: end
                },
                'type.name': 'covid19'
            }
        },
        {
            $addFields: {
                orgIdentifier: {
                    $toObjectId: '$createdBy.organizacion.id'
                },
                fechaNacimientoString: {
                    $dateToString: {
                        date: '$paciente.fechaNacimiento',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                }
            }
        },
        {
            $lookup: {
                from: 'organizacion',
                localField: 'orgIdentifier',
                foreignField: '_id',
                as: 'Organization'
            }
        },
        {
            $project: {
                _id: '$_id',
                Tipo: '$type.name',
                Paciente_id: '$paciente.id',
                Paciente_nombre: '$paciente.nombre',
                Paciente_apellido: '$paciente.apellido',
                Paciente_documento: '$paciente.documento',
                Paciente_fec_nacimiento: '$fechaNacimientoString',
                Paciente_sexo: '$paciente.sexo',
                Organizacion: '$Organization',
                Fecha_Ficha: {
                    $dateToString: {
                        date: '$createdAt',
                        format: '%d-%m-%Y',
                        timezone: 'America/Argentina/Buenos_Aires'
                    }
                },
                secciones: '$secciones',
                clasifications: {
                    $filter: {
                        input: '$secciones',
                        cond: { $eq: ['$$this.name', 'Clasificacion'] }
                    }
                },
                informClinica: {
                    $filter: {
                        input: '$secciones',
                        cond: { $eq: ['$$this.name', 'Informacion Clinica'] }
                    }
                },
            }
        },
        {
            $addFields: {
                Type_clasification: '$clasifications.fields.clasificacion',
                requerimientoCuidado: { $arrayElemAt: ['$informClinica.fields.requerimientocuidado', 0] },
            }
        },
        {
            $match: { 'Type_clasification.0.id': { $ne: 'controlAlta' } }
        },
        {
            $unwind: '$secciones'
        },
        {
            $match: {
                'secciones.name': { $regex: SECCION_CLASIFICACION }
            }
        },
        {
            $project: {
                _id: '$_id',
                Tipo: '$Tipo',
                Paciente_id: '$Paciente_id',
                Paciente_nombre: '$Paciente_nombre',
                Paciente_apellido: '$Paciente_apellido',
                Paciente_documento: '$Paciente_documento',
                Paciente_fec_nacimiento: '$Paciente_fec_nacimiento',
                Paciente_sexo: '$Paciente_sexo',
                Fecha_Ficha: '$Fecha_Ficha',
                Organizacion_Id: { $toString: { $arrayElemAt: ['$Organizacion._id', 0] } },
                Organizacion_Nombre: { $arrayElemAt: ['$Organizacion.nombre', 0] },
                Sisa: { $arrayElemAt: ['$Organizacion.codigo.sisa', 0] },
                clasificacion: { $arrayElemAt: ['$secciones.fields.segundaclasificacion.nombre', 0] },
                requerimientoCuidado: { $arrayElemAt: ['$requerimientoCuidado.nombre', 0] },
                resultado: { $arrayElemAt: ['$secciones.fields.clasificacionfinal', 0] },
            },
        },
        {
            $match: {
                resultado: { $regex: 'Confirmado' }
            }
        }

    ];
    const fichas = await FormsEpidemiologia.aggregate(pipelineConfirmados);
    for (const unaFicha of fichas) {
        const documento = unaFicha.Paciente_documento;
        const requerimientoCuidado = unaFicha.requerimientoCuidado;
        if (documento) {
            const eventoNominal = {
                idTipodoc: '1',
                nrodoc: documento,
                sexo: unaFicha.Paciente_sexo === 'femenino' ? 'F' : (unaFicha.Paciente_sexo === 'masculino') ? 'M' : '',
                fechaNacimiento: unaFicha.Paciente_fec_nacimiento,
                idGrupoEvento: '113',
                idEvento: requerimientoCuidado === 'Ambulatorio' ? '321' : '322',
                idEstablecimientoCarga: unaFicha.Sisa.toString(),
                fechaPapel: unaFicha.Fecha_Ficha,
                idClasificacionManualCaso: unaFicha.clasificacion === 'Antígeno' ? '820' : ''
            };
            const dto = {
                usuario: user,
                clave,
                altaEventoCasoNominal: eventoNominal
            };

            const log = {
                fecha: new Date(),
                sistema: 'Sisa',
                key: unaFicha.clasificacion === 'Antígeno' ? '820' : '',
                idPaciente: unaFicha.Paciente_id,
                info_enviada: eventoNominal,
                resultado: {}
            };
            if (dto.altaEventoCasoNominal.idClasificacionManualCaso) {
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
                        const id_caso = resJson.id_caso ? resJson.id_caso : '';

                        log.resultado = {
                            resultado: resJson.resultado ? resJson.resultado : '',
                            id_caso,
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
        }
    }
    done();
}
