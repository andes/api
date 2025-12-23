import { SIP_PLUS, userScheduler } from '../config.private';
import { perinatalLog } from '../modules/perinatal/perinatal.log';
import { handleHttpRequest } from './requestHandler';

const fechaFinEmbarazoLog = perinatalLog.startTrace();


export async function getPaciente(paciente: any) {

    const documento = paciente.documento || '';

    if (documento) {
        try {
            const options = {
                uri: `${SIP_PLUS.host}/record/AR/DNI/${documento}`,
                method: 'GET',
                json: true,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Basic ' + Buffer.from(`${SIP_PLUS.username}:${SIP_PLUS.password}`, 'binary').toString('base64')
                }
            };
            const [status, resJson] = await handleHttpRequest(options);

            if (status >= 200 && status < 300) {
                const keyResponse = Object.keys(resJson).length;
                return { paciente: keyResponse ? resJson : null };
            }
            if (status === 404) {
                // paciente no encontrado
                return { paciente: null };
            }

        } catch (error) {
            await fechaFinEmbarazoLog.error('getPaciente:error', paciente, error, userScheduler);
        }
    }
    return null;
}
