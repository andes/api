import { EventCore } from '@andes/event-bus';
import { userScheduler } from '../../../config.private';
import { SECCION_CLASIFICACION } from './constantes';
import { FormEpidemiologiaCtr } from './forms-epidemiologia.routes';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { sisaLog } from '../../sisa/logger/sisaLog';
import { altaEventoV2 } from '../../sisa/controller/sisa.controller';
import { FormsEpidemiologia } from '../../forms/forms-epidemiologia/forms-epidemiologia-schema';
import moment = require('moment');


const dataLog: any = new Object(userScheduler);

// Descripción: Al recibir una notficación del laboratorio se actualiza el estado de la PCR en la ficha de epidemiología
EventCore.on('notification:fichaEpidemiologica:laboratory', async (info) => {
    const fichas = await FormEpidemiologiaCtr.search({ paciente: info.paciente.id });
    if (fichas.length > 0) {
        const fichasOrdenadas = fichas.sort((a, b) => b.createdAt - a.createdAt);
        const resultadoLabo = (info.resultado === 'SE DETECTA GENOMA DE SARS-CoV-2') ? 'Confirmado' : (info.resultado === 'NO SE DETECTA GENOMA DE SARS-CoV-2') ? 'Descartado' : 'Repetir';
        if (resultadoLabo !== 'Repetir') { // NO hace nada si fue marcado para repeticióno anulado
            const resultadoPCR = {
                pcr: {
                    id: resultadoLabo === 'Confirmado' ? 'confirmado' : 'descartado',
                    nombre: resultadoLabo === 'Confirmado' ? 'SE DETECTA GENOMA DE SARS-CoV-2' : 'NO SE DETECTA GENOMA DE SARS-CoV-2'
                }
            };
            const lastFicha = fichasOrdenadas[0];
            try {
                lastFicha.secciones.forEach(s => {
                    if (s.name === SECCION_CLASIFICACION) {
                        const cfi = s.fields.findIndex(x => x.clasificacionfinal);
                        s.fields[cfi] = { clasificacionfinal: resultadoLabo };
                        const pcri = s.fields.findIndex(x => x.pcr);
                        if (pcri > -1) {
                            s.fields[pcri] = resultadoPCR;
                        } else {
                            s.fields.push(resultadoPCR);
                        }
                    }
                });
                return await FormEpidemiologiaCtr.update(lastFicha.id, lastFicha, dataLog);
            } catch (error) {
                return error;
            }
        }
    }
});

EventCore.on('alta:fichaEpidemiologica:snvs', async (info) => {
    const organizacion = await Organizacion.findById(info.createdBy.organizacion.id);
    const idEstablecimientoCarga = organizacion?.codigo?.sisa;
    const clasificacionCaso = getClasificacionManual(info);
    if (idEstablecimientoCarga && clasificacionCaso) {
        const eventoNominal = {
            ciudadano: {
                apellido: info.paciente.apellido,
                nombre: info.paciente.nombre,
                tipoDocumento: '1',
                numeroDocumento: info.paciente.documento,
                sexo: info.paciente.sexo === 'femenino' ? 'F' : (info.paciente.sexo === 'masculino') ? 'M' : 'X',
                fechaNacimiento: moment(info.paciente.fechaNacimiento).format('DD-MM-YYYY'),
                seDeclaraPuebloIndigena: 'No',
                paisEmisionTipoDocumento: null,
                telefono: info.paciente.telefono !== '' ? info.paciente.telefono : null,
                mail: null,
                personaACargo: {
                    tipoDocumento: null,
                    numeroDocumento: null,
                    vinculo: null
                }
            },
            eventoCasoNominal: {
                idGrupoEvento: parseInt(clasificacionCaso.idGrupoEvento, 10),
                idEvento: parseInt(clasificacionCaso.idEvento, 10),
                idEstablecimientoCarga,
                fechaPapel: clasificacionCaso.Fecha_Ficha,
                idClasificacionManualCaso: parseInt(clasificacionCaso.event, 10),
            }
        };

        if (eventoNominal.eventoCasoNominal.idClasificacionManualCaso) {
            postSisa(eventoNominal, info);
        }
    } else {
        const log = {
            fecha: new Date(),
            sistema: 'Sisa',
            key: info.Tipo,
            idPaciente: info.paciente.id,
            info_enviada: {},
            resultado: {
                resultado: 'ERROR_DE_ENVIO',
                id_caso: '',
                description: !idEstablecimientoCarga ? 'No se encontró el código SISA del establecimiento' : 'No se encontró una clasificación manual en la ficha'
            }
        };
        await sisaLog.error('sisa:export:SNVS:evento', { error: log }, 'error al dar de alta evento', userScheduler);
    }
});

const getClasificacionManual = (ficha) => {
    const configFields = ficha?.config?.configField ?? [];
    const gcEncontrado = configFields.find((GC) =>
        (ficha.secciones ?? []).some((unaSeccion) =>
            (unaSeccion.fields ?? []).some((f) =>
                f[GC.key] === GC.value || f[GC.key]?.id === GC.value
            )
        )
    );
    return gcEncontrado ?? null;
};

const postSisa = async (eventoNominal, unaFicha) => {
    const log = {
        fecha: new Date(),
        sistema: 'Sisa',
        key: unaFicha.Tipo,
        idPaciente: unaFicha.paciente.id,
        info_enviada: {},
        resultado: {}
    };
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
};
