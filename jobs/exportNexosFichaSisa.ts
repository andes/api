import * as moment from 'moment';
import { InformacionExportada } from '../core/log/schemas/logExportaInformacion';
import { FormsEpidemiologia } from '../modules/forms/forms-epidemiologia/forms-epidemiologia-schema';
import { handleHttpRequest } from '../utils/requestHandler';
import { sisa } from './../config.private';

const user = sisa.user_snvs;
const clave = sisa.password_snvs;
const urlSisa = sisa.url_snvs;

async function getToken(usr: string, pass: string) {
    const url = `${sisa.url_snvs_covid}/auth/realms/sisa/protocol/openid-connect/token`;
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('client_id', 'snvs-token');
    formData.append('username', usr);
    formData.append('password', pass);
    const options = {
        uri: url,
        method: 'POST',
        form: formData.toString(),
        headers: {
            'Content-Type': 'application/json'
        },
        json: true,
    };
    const [status, resJson] = await handleHttpRequest(options);
    if (status >= 200 && status <= 299) {
        if (resJson.access_token) {
            return resJson.access_token;
        }
    }
    return null;
}

async function getCasosConfirmados(documento: String) {
    let token = await getToken(sisa.user_snvs_covid, sisa.pass_snvs_covid);
    const url = `${sisa.url_snvs_covid}/snvs/covid19/personas?nrodoc=${documento}`;
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-type': 'application/json',
        Accept: 'application/json'
    };
    const options = {
        uri: url,
        method: 'GET',
        headers,
        json: true
    };
    const [status, resJson] = await handleHttpRequest(options);
    if (status >= 200 && status <= 299) {
        if (resJson && resJson.length > 0) {
            // Se filtran los eventos de casos confirmados
            const eventos = resJson.filter(evento => { return evento.clasif_RESUMEN === 'Confirmado'; });
            return eventos;
        }
    }
    return [];
}

export async function exportSisaFicha(done, horas, desde, hasta) {
    const start = desde ? moment(desde).toDate() : moment().subtract(horas, 'h').toDate();
    const end = hasta ? moment(hasta).toDate() : moment().toDate();
    const pipelineConfirmados = [
        {
            $match: {
                createdAt: {
                    $gte: start,
                    $lte: end
                }
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
                fields: '$secciones'
            }
        },
        {
            $unwind: '$fields'
        },
        {
            $match: {
                'fields.name': { $regex: 'Tipo de confirmación y Clasificación Final' }
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
                clasificacion: { $arrayElemAt: ['$fields.fields.segundaclasificacion.nombre', 0] },
                resultado: { $arrayElemAt: ['$fields.fields.clasificacionfinal', 0] },
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
        let casos = [];
        if (documento) {
            casos = await getCasosConfirmados(documento);
        }
        if (casos.length <= 0) {
            const eventoNominal = {
                idTipodoc: '1',
                nrodoc: documento,
                sexo: unaFicha.Paciente_sexo === 'femenino' ? 'F' : (unaFicha.Paciente_sexo === 'masculino') ? 'M' : '',
                fechaNacimiento: unaFicha.Paciente_fec_nacimiento,
                idGrupoEvento: '113',
                idEvento: '307',
                idEstablecimientoCarga: unaFicha.Sisa.toString(),
                fechaPapel: unaFicha.Fecha_Ficha,
                idClasificacionManualCaso: unaFicha.clasificacion === 'Criterio clínico epidemiológico (Nexo)' ? '792' : unaFicha.clasificacion === 'Antígeno' ? '795' : ''
            };

            const dto = {
                usuario: user,
                clave,
                altaEventoCasoNominal: eventoNominal
            };

            const log = {
                fecha: new Date(),
                sistema: 'Sisa',
                key: unaFicha.clasificacion === 'Criterio clínico epidemiológico (Nexo)' ? '792' : unaFicha.clasificacion === 'Antígeno' ? '795' : '',
                idPaciente: unaFicha.Paciente_id,
                info_enviada: eventoNominal,
                resultado: {}
            };
            // Debe tener identificador manual de caso
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
                    let info = new InformacionExportada(log);
                    await info.save();

                } catch (error) {
                    log.resultado = {
                        resultado: 'ERROR_DE_ENVIO',
                        id_caso: '',
                        description: error.toString()
                    };
                    let info = new InformacionExportada(log);
                    await info.save();
                }
            }
        }
    }
    done();
}
