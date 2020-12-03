import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { userScheduler } from '../../../config.private';
const regtest = /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ ']+/;
import { sisa, sisaToAndes } from '@andes/fuentes-autenticas';
import { sisa as sisaConfig } from '../../../config.private';
import { log } from '@andes/log';
import { logKeys } from './../../../config';
import { Matching } from '@andes/match';
import * as config from '../../../config';

/**
 * Busca pacientes validados con errores de charset en nombre y apellido,
 *  intenta corregir los errores con SISA y si no puede los deja como temporales en la bd de temporales.
 * @export
 * @param {*} done
 */
export async function regexChecker(done) {
    try {
        let cursor = Paciente.find({ $or: [{ nombre: { $regex: regtest } }, { apellido: { $regex: regtest } }] }).limit(100).cursor();
        let countPacienteError = 0;

        await cursor.eachAsync(async (pac: any) => {
            const pacienteOld = pac.toObject();
            countPacienteError = countPacienteError + 1;
            let pacienteSisa: any = await sisa(pac, sisaConfig, sisaToAndes);
            if (pacienteSisa) {
                let match = new Matching();
                const weights = config.mpi.weightsDefault;
                const porcentajeMatcheo: number = match.matchPersonas(pacienteOld, pacienteSisa, weights, config.algoritmo);

                if (porcentajeMatcheo < 0.95) {
                    pac.estado = 'temporal';
                } else {
                    pac.nombre = pacienteSisa.nombre;
                    pac.apellido = pacienteSisa.apellido;
                }
                await PacienteCtr.update(pac.id, pac, userScheduler as any);
                log(userScheduler, logKeys.regexChecker.key, pac, logKeys.regexChecker.operacion, pac, pacienteOld);
            }
        }).catch(err => {
            log(userScheduler, logKeys.regexChecker.key, null, logKeys.regexChecker.operacion, null, null, err);
            done();
        });
        done();

    } catch (err) {
        log(userScheduler, logKeys.regexChecker.key, null, logKeys.regexChecker.operacion, null, null, err);
        done();
    }
}
