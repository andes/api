import { paciente } from '../schemas/paciente';
import { updatePaciente, validarPaciente } from './paciente';
import { userScheduler } from '../../../config.private';
import { updateValidadosLog } from '../mpi.log';
import moment = require('moment');
const logUpdateValidados = updateValidadosLog.startTrace();

export async function updateValidados(done) {
    const limit = 500;
    let fechaDesde = moment().subtract(2, 'months');
    try {
        let pacientes = await paciente.find({ updatedAt: { $lte: fechaDesde } }).limit(limit);
        for (let pac of pacientes) {
            const pacObj = pac.toObject();
            let data: any = {};
            let resultado = await validarPaciente(pac, userScheduler);

            if (resultado.validado) {
                data.foto = resultado.paciente.foto;
                if (resultado.paciente.fechaFallecimiento) {
                    data.fechaFallecimiento = moment(resultado.paciente.fechaFallecimiento).add(4, 'h').toDate();
                }
                if (resultado.paciente.direccion[1]) {  // direccion legal
                    if (pacObj.direccion?.length) {
                        data.direccion = [pacObj.direccion[0], resultado.paciente.direccion[1]];
                    } else {
                        // si el paciente no tiene direccion le asignamos ambas con el valor de su direccion legal
                        data.direccion = resultado.paciente.direccion;
                    }
                }
                // agregamos atributo para loguear en update
                await updatePaciente(pac, data, userScheduler);
                await logUpdateValidados.info('update-validados-ok', { paciente: resultado.paciente.id }, userScheduler);
            }
        }
    } catch (err) {
        await logUpdateValidados.error('update-validados-error', err, userScheduler);
    }
    done();
}
