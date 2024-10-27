import * as moment from 'moment';
import { FormsEpidemiologia } from '../modules/forms/forms-epidemiologia/forms-epidemiologia-schema';
import { Forms } from '../modules/forms/forms.schema';
import { sisaLog } from '../modules/sisa/logger/sisaLog';
import { userScheduler } from '../config.private';
import { altaDeterminacion, altaEventoV2, altaMuestra } from '../modules/sisa/controller/sisa.controller';

export async function exportFichaSNVS(done) {
    const start = (moment(new Date()).startOf('day').subtract(1000, 'days').toDate() as any);
    const end = (moment(new Date()).endOf('day').toDate() as any);

    const formulario = await Forms.find({ active: true, 'config.idEvento': { $exists: true } });
    for (const unForm of formulario) {
        const configSNVS = unForm.config;
        const pipelineConfirmados = [
            {
                $match: {
                    createdAt: {
                        $gte: start,
                        $lte: end
                    },
                    'type.name': unForm.name
                }
            },
            {
                $lookup: {
                    from: 'paciente',
                    localField: 'paciente.id',
                    foreignField: '_id',
                    as: 'pacienteCompleto'
                }
            },
            {
                $unwind: '$pacienteCompleto'
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
                    },
                    telefono: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$pacienteCompleto.contacto',
                                    as: 'unContacto',
                                    cond: {
                                        $eq: [
                                            '$$unContacto.tipo',
                                            'celular'
                                        ]
                                    }
                                }
                            },
                            0
                        ]
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
                $unwind: '$Organization'
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
                    Paciente_telefono: {
                        $ifNull: [
                            '$telefono.valor',
                            ''
                        ]
                    },
                    Fecha_Ficha: {
                        $dateToString: {
                            date: '$createdAt',
                            format: '%d-%m-%Y',
                            timezone: 'America/Argentina/Buenos_Aires'
                        }
                    },
                    Organizacion_Id: { $toString: '$Organization._id' },
                    Organizacion_Nombre: '$Organization.nombre',
                    Sisa: '$Organization.codigo.sisa',
                    SisaInterno: '$Organization.codigo.internoSisa',
                    secciones: '$secciones'
                }
            }
        ];
        try {
            const fichas = await FormsEpidemiologia.aggregate(pipelineConfirmados);

            for (const unaFicha of fichas) {
                const documento = unaFicha.Paciente_documento;
                const idEvento = configSNVS.idEvento;
                const idGrupoEvento = configSNVS.idGrupoEvento;
                const idEstablecimientoCarga = unaFicha.Sisa.toString();
                const idSisa = unaFicha.SisaInterno ? unaFicha.SisaInterno.toString() : unaFicha.Sisa.toString();
                if (documento && !unaFicha.idCasoSnvs) {
                    const clasificacion = buscarClasificacion(configSNVS, unaFicha.secciones);
                    const codigoSisaEvento = unaFicha.secciones;
                    if (clasificacion) {
                        const eventoNominal = {
                            ciudadano: {
                                apellido: unaFicha.Paciente_apellido,
                                nombre: unaFicha.Paciente_nombre,
                                tipoDocumento: '1',
                                numeroDocumento: unaFicha.Paciente_documento,
                                sexo: unaFicha.Paciente_sexo === 'femenino' ? 'F' : (unaFicha.Paciente_sexo === 'masculino') ? 'M' : 'X',
                                fechaNacimiento: unaFicha.Paciente_fec_nacimiento,
                                seDeclaraPuebloIndigena: 'No',
                                paisEmisionTipoDocumento: null,
                                telefono: unaFicha.Paciente_telefono !== '' ? unaFicha.Paciente_telefono : null,
                                mail: null,
                                personaACargo: {
                                    tipoDocumento: null,
                                    numeroDocumento: null,
                                    vinculo: null
                                }
                            },
                            eventoCasoNominal: {
                                idGrupoEvento,
                                idEvento,
                                idEstablecimientoCarga,
                                fechaPapel: unaFicha.Fecha_Ficha,
                                idClasificacionManualCaso: clasificacion
                            }
                        };
                        const log = {
                            fecha: new Date(),
                            sistema: 'Sisa',
                            key: unaFicha.tipo,
                            idPaciente: unaFicha.Paciente_id,
                            info_enviada: eventoNominal,
                            resultado: {}
                        };
                        if (eventoNominal.eventoCasoNominal.idClasificacionManualCaso) {
                            try {
                                const response = await altaEventoV2(eventoNominal);
                                if (response) {
                                    const id_caso = response.id_caso ? response.id_caso : '';
                                    log.resultado = {
                                        resultado: response.resultado ? response.resultado : '',
                                        id_caso,
                                        description: response.description ? response.description : ''
                                    };
                                    try {
                                        await FormsEpidemiologia.updateOne({ _id: unaFicha._id }, { $set: { idCasoSnvs: id_caso } });
                                    } catch (error) {
                                        log.resultado = {
                                            resultado: 'ERROR_DE_GUARDADO_ID_CASO',
                                            id_caso,
                                            description: error.toString()
                                        };
                                        await sisaLog.error('sisa:export:SNVS:evento', { error: log }, 'error al guardar el idCasoSisa', userScheduler);
                                    }
                                } else {
                                    log.resultado = {
                                        resultado: 'ERROR_DE_ENVIO',
                                        id_caso: '',
                                        description: 'No se recibió ningún resultado'
                                    };
                                }
                                await sisaLog.info('sisa:export:SNVS:evento', { params: log }, userScheduler);

                            } catch (error) {
                                log.resultado = {
                                    resultado: 'ERROR_DE_ENVIO',
                                    id_caso: '',
                                    description: error.toString()
                                };
                                await sisaLog.error('sisa:export:SNVS:evento', { error: log }, 'error al dar de alta evento', userScheduler);

                            }
                        }
                    }
                }
            }
        } catch (error) {
            await sisaLog.error('sisa:export:SNVS:evento', { error }, error.message, userScheduler);
        }
    }
    done();
}

function buscarClasificacion(configuracion, secciones) {
    for (const GC of configuracion.configField) {
        for (const unaSeccion of secciones) {
            const salida = unaSeccion.fields.find(f => f[GC.key] === GC.value || f[GC.key]?.id === GC.value);
            if (salida) {
                return parseInt(GC.event, 10);
            }
        }
    };
    return 0;
}


async function confirmarMuestra(ficha, idEstablecimientoToma, idEventoCaso) {
    const dtoMuestra = {
        adecuada: true,
        aislamiento: false,
        fechaToma: moment(ficha.Fecha_Muestra).format('YYYY-MM-DD'),
        idEstablecimientoToma,
        idEventoCaso,
        idMuestra: 276, // Hisopado nasofaríngeo (para test de Ag)
        idtipoMuestra: 4, // Humano - espacios no estériles
        muestra: true
    };
    return await altaMuestra(dtoMuestra);
}

async function confirmarDeterminacion(ficha, idEvento, idEstablecimiento, idEventoMuestra) {
    const dtoResultado = {
        derivada: false,
        fechaEmisionResultado: moment(ficha.Fecha_Muestra).format('YYYY-MM-DD'),
        idEstablecimiento,
        idEvento,
        idEventoMuestra,
        idPrueba: 1087, // Inmunocromatografía
        idResultado: 109,
        idTipoPrueba: 739, // Genoma viral SARS-CoV-2
        noApta: true,
        valor: 'Confirmado por antígeno'
    };
    return altaDeterminacion(dtoResultado);
}

