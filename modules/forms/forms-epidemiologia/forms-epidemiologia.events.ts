import { EventCore } from '@andes/event-bus';
import { userScheduler } from '../../../config.private';
import { FormEpidemiologiaCtr } from './forms-epidemiologia.routes';

let dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

// Al recibir una notficación del laboratorio se actualiza el estado de la PCR en la ficha de epidemiología
EventCore.on('notification:fichaEpidemiologica:laboratory', async (info) => {
    const fichas = await FormEpidemiologiaCtr.search({ paciente: info.paciente.id });
    const fichasOrdenadas = fichas.sort((a, b) => b.createdAt - a.createdAt);
    const pcrResultado = info.resultado === 'confirmado' ? 'Confirmado' : 'Descartado'; // falta saber bien como va a venir el dato de rsultado en info.
    let lastFicha = fichasOrdenadas[0];
    try {
        lastFicha.secciones.forEach(s => {
            if (s.name === 'Tipo de confirmación y Clasificación Final') {
                const cfi = s.fields.findIndex(x => x.clasificacionfinal);
                s.fields[cfi] = { clasificacionfinal: pcrResultado };
                const pcri = s.fields.findIndex(x => x.pcr);
                if (pcri > -1) {
                    s.fields[pcri] = {
                        pcr: {
                            id: pcrResultado === 'Confirmado' ? 'confirmado' : 'descartado',
                            nombre: pcrResultado === 'Confirmado' ? 'Se detecta genoma de SARS-CoV-2' : 'No se detecta genoma de SARS-CoV-2'
                        }
                    };
                } else {
                    // Hay q ver
                }
            }
        });
        return await FormEpidemiologiaCtr.update(lastFicha.id, lastFicha, dataLog);
    } catch (error) {
        return error;
    }
});

