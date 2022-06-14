import { EventCore } from '@andes/event-bus';
import { userScheduler } from '../../../config.private';
import { SECCION_CLASIFICACION } from './constantes';
import { FormEpidemiologiaCtr } from './forms-epidemiologia.routes';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { sisa } from '../../../config.private';
import { handleHttpRequest } from '../../../utils/requestHandler';
import { InformacionExportada } from '../../../core/log/schemas/logExportaInformacion';
import * as moment from 'moment';

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
    const clasificacionCaso = getClasificacionManual(info);
    const eventoNominal = {
        ciudadano: {
            apellido: info.paciente.apellido,
            nombre: info.paciente.nombre,
            tipoDocumento: '1',
            numeroDocumento: info.paciente.documento,
            sexo: info.paciente.sexo === 'femenino' ? 'F' : (info.paciente.sexo === 'masculino') ? 'M' : '',
            fechaNacimiento: moment(info.paciente.fechaNacimiento).format('DD/MM/YYYY')
        },
        eventoCasoNominal: {
            idGrupoEvento: info.config.idGrupoEvento,
            idEvento: info.config.idEvento,
            idEstablecimientoCarga: organizacion.codigo.sisa,
            fechaPapel: moment(info.createdAt).format('DD/MM/YYYY'),
            idClasificacionManualCaso: clasificacionCaso ? clasificacionCaso : '',
        }
    };
    if (eventoNominal.eventoCasoNominal.idClasificacionManualCaso) {
        postSisa(eventoNominal, info);
    }
});

const getClasificacionManual = (ficha) => {
    let clasificacion = null;
    const configFields = ficha.config.configField;
    configFields.forEach(field => {
        ficha.secciones.forEach((seccion) => {
            const found = seccion.fields.find(elem => (Object.keys(elem))[0] === field.key.id);
            if (found) {
                if (field.value) {
                    const val: any = Object.values(found)[0];
                    if (val.id === field.value.id) {
                        clasificacion = field.event;
                    }
                } else {
                    clasificacion = field.event;
                }
            }
        });
    });
    return clasificacion;
};

const postSisa = async (dto, ficha) => {
    const log = {
        fecha: new Date(),
        sistema: 'Sisa',
        key: dto.eventoCasoNominal.idClasificacionManualCaso,
        idPaciente: ficha.paciente.id,
        info_enviada: dto.eventoCasoNominal,
        resultado: {}
    };
    try {
        const options = {
            uri: sisa.url,
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
            ficha.snvs = true; // marca la ficha como que ya se envio sisa
            FormEpidemiologiaCtr.update(ficha.id, ficha, dataLog);
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
};
