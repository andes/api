import { EventCore } from '@andes/event-bus';
import { userScheduler } from '../../../config.private';
import { getSeccionClasificacion } from './controller/forms-epidemiologia.controller';
import { FormEpidemiologiaCtr } from './forms-epidemiologia.routes';

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

                const s = getSeccionClasificacion(lastFicha);
                if (s) {
                    const cfi = s.fields.findIndex(x => x.clasificacionfinal);
                    s.fields[cfi] = { clasificacionfinal: resultadoLabo };
                    const pcri = s.fields.findIndex(x => x.pcr);
                    if (pcri > -1) {
                        s.fields[pcri] = resultadoPCR;
                    } else {
                        s.fields.push(resultadoPCR);
                    }
                }
                return await FormEpidemiologiaCtr.update(lastFicha.id, lastFicha, dataLog);
            } catch (error) {
                return error;
            }
        }
    }
});
