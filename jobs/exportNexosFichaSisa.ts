import * as moment from 'moment';
import { InformacionExportada } from '../core/log/schemas/logExportaInformacion';
import { SECCION_CLASIFICACION } from '../modules/forms/forms-epidemiologia/constantes';
import { FormsEpidemiologia } from '../modules/forms/forms-epidemiologia/forms-epidemiologia-schema';
import { Forms } from '../modules/forms/forms.schema';
import { altaDeterminacion, altaEventoV2, altaMuestra, getEventoId } from '../modules/sisa/controller/sisa.controller';

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
                clasificacionFinal: {
                    $filter: {
                        input: '$secciones',
                        cond: { $eq: ['$$this.name', SECCION_CLASIFICACION] }
                    }
                },
            }
        },
        {
            $addFields: {
                Type_clasification: '$clasifications.fields.clasificacion',
                requerimientoCuidado: { $arrayElemAt: ['$informClinica.fields.requerimientocuidado', 0] },
                fechaMuestra: { $arrayElemAt: ['$clasificacionFinal.fields.fechamuestra', 0] }
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
                Fecha_Muestra: { $arrayElemAt: ['$fechaMuestra', 0] },
                Organizacion_Id: { $toString: { $arrayElemAt: ['$Organizacion._id', 0] } },
                Organizacion_Nombre: { $arrayElemAt: ['$Organizacion.nombre', 0] },
                Sisa: { $arrayElemAt: ['$Organizacion.codigo.sisa', 0] },
                SisaInterno: { $arrayElemAt: ['$Organizacion.codigo.internoSisa', 0] },
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
        const idEvento = getEventoId(unaFicha.requerimientoCuidado);
        const idEstablecimientoCarga = unaFicha.Sisa.toString();
        const idSisa = unaFicha.SisaInterno ? unaFicha.SisaInterno.toString() : unaFicha.Sisa.toString();

        if (documento) {
            const eventoNominal = {
                ciudadano: {
                    apellido: unaFicha.Paciente_apellido,
                    nombre: unaFicha.Paciente_nombre,
                    tipoDocumento: '1',
                    numeroDocumento: unaFicha.Paciente_documento,
                    sexo: unaFicha.Paciente_sexo === 'femenino' ? 'F' : (unaFicha.Paciente_sexo === 'masculino') ? 'M' : '',
                    fechaNacimiento: unaFicha.Paciente_fec_nacimiento,
                    seDeclaraPuebloIndigena: 'No',
                    paisEmisionTipoDocumento: null,
                    telefono: null,
                    mail: null,
                    personaACargo: {
                        tipoDocumento: null,
                        numeroDocumento: null,
                        vinculo: null
                    }
                },
                eventoCasoNominal: {
                    idGrupoEvento: '113',
                    idEvento,
                    idEstablecimientoCarga,
                    fechaPapel: unaFicha.Fecha_Ficha,
                    idClasificacionManualCaso: unaFicha.clasificacion === 'Antígeno COVID-19' ? '898' : ''
                }
            };
            const log = {
                fecha: new Date(),
                sistema: 'Sisa',
                key: unaFicha.clasificacion === 'Antígeno COVID-19' ? 'antigeno' : '',
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

                        const confirmacionMuestra = await confirmarMuestra(unaFicha, idSisa, id_caso);
                        if (confirmacionMuestra.id) {
                            const confirmacionDeterminacion = await confirmarDeterminacion(unaFicha, idEvento, idSisa, confirmacionMuestra.id);
                            if (!confirmacionDeterminacion.id) {
                                log.resultado = {
                                    resultado: 'ERROR_DE_ENVIO',
                                    id_caso: '',
                                    description: 'No se dio de alta la determinación'
                                };
                            }

                        } else {
                            log.resultado = {
                                resultado: 'ERROR_DE_ENVIO',
                                id_caso: '',
                                description: 'No se dio de alta la muestra'
                            };
                        }
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

export async function exportFichaSNVS(done, horas, desde, hasta) {
    const start = desde ? moment(desde).toDate() : moment().subtract(horas, 'h').toDate();
    const end = hasta ? moment(hasta).toDate() : moment().toDate();

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
        const fichas = await FormsEpidemiologia.aggregate(pipelineConfirmados);

        for (const unaFicha of fichas) {
            const documento = unaFicha.Paciente_documento;
            const idEvento = configSNVS.idEvento;
            const idGrupoEvento = configSNVS.idGrupoEvento;
            const idEstablecimientoCarga = unaFicha.Sisa.toString();
            const idSisa = unaFicha.SisaInterno ? unaFicha.SisaInterno.toString() : unaFicha.Sisa.toString();

            if (documento) {
                const clasificacion = buscarClasificacion(configSNVS, unaFicha.secciones);
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

