import { EventCore } from '@andes/event-bus';
import { userScheduler } from '../../../config.private';
import { FormEpidemiologiaCtr } from './forms-epidemiologia.routes';

let dataLog: any = new Object(userScheduler);

// Descripción: Al recibir una notficación del laboratorio se actualiza el estado de la PCR en la ficha de epidemiología
EventCore.on('notification:fichaEpidemiologica:laboratory', async (info) => {
    const fichas = await FormEpidemiologiaCtr.search({ paciente: info.paciente.id });
    if (fichas.length > 0) {
        const fichasOrdenadas = fichas.sort((a, b) => b.createdAt - a.createdAt);
        const resultadoLabo = (info.resultado === 'Se detecta genoma de SARS-CoV-2') ? 'Confirmado' : (info.resultado === 'No se detecta genoma de SARS-CoV-2') ? 'Descartado' : 'Repetir';
        if (resultadoLabo !== 'Repetir') { // NO hace nada si fue marcado para repeticióno anulado
            const resultadoPCR = {
                pcr: {
                    id: resultadoLabo === 'Confirmado' ? 'confirmado' : 'descartado',
                    nombre: resultadoLabo === 'Confirmado' ? 'Se detecta genoma de SARS-CoV-2' : 'No se detecta genoma de SARS-CoV-2'
                }
            };
            let lastFicha = fichasOrdenadas[0];
            try {
                lastFicha.secciones.forEach(s => {
                    if (s.name === 'Tipo de confirmación y Clasificación Final') {
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
