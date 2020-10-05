
import { userScheduler } from '../../../config.private';
import { validar } from '../../../core-v2/mpi/validacion';
import { updateValidadosLog } from '../mpi.log';
import * as moment from 'moment';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
const logUpdateValidados = updateValidadosLog.startTrace();

export async function updateValidados(done) {
    const cantidad = process.env.COUNT_VALIDADO || '500';
    const limite = parseInt(cantidad, 10);
    const fechaDesde = moment().subtract(3, 'months');
    try {
        const options = { limit: limite, sort: { updatedAt: -1 } };
        const pacientes = await PacienteCtr.search({ estado: 'validado', activo: true, updatedAt: { $lte: fechaDesde } }, options as any, userScheduler as any);
        pacientes.forEach(async (pac: any) => {
            let data: any = {};
            let persona = await validar(pac.documento, pac.sexo);
            if (persona.validado) {
                data.foto = persona.foto;
                if (persona.paciente.fechaFallecimiento) {
                    data.fechaFallecimiento = persona.fechaFallecimiento;
                }
                if (persona.direccion[1]) {  // direccion legal
                    if (pac.direccion?.length) {
                        data.direccion = [pac.direccion[0], persona.direccion[1]];
                    } else {
                        // si el paciente no tiene direccion le asignamos ambas con el valor de su direccion legal
                        data.direccion = persona.direccion;
                    }
                }
                await PacienteCtr.update(pac.id, data, userScheduler as any);
            }
        });
        await logUpdateValidados.info('update-validados-ok', {}, userScheduler);
    } catch (err) {
        await logUpdateValidados.error('update-validados-error', err, userScheduler);
    }
    done();
}
