
import { ElasticSync } from '../../../utils/elasticSync';
import { pacienteMpi, paciente } from '../schemas/paciente';
import { userScheduler } from '../../../config.private';
import { Auth } from '../../../auth/auth.class';
const regtest = /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ ']+/;
import { matchSisa } from '../../../utils/servicioSisa';
import { Logger } from '../../../utils/logService';
/**
 * Busca pacientes validados en MPI con errores de charset en nombre y apellido,
 *  intenta corregir los errores con SISA y si no puede los deja como temporales en la bd de temporales.
 * @export
 * @param {*} done
 */
export async function regexChecker(done) {
    try {

        let cursor = await pacienteMpi.find({ $or: [{ nombre: { $regex: regtest } }, { apellido: { $regex: regtest } }] }).limit(100).cursor();
        let countPacienteError = 0;

        await cursor.eachAsync(async (pac: any) => {
            const pacienteOld = pac;
            countPacienteError = countPacienteError + 1;

            // Obtenemos el paciente con errores desde MPI , lo borramos y le cambiamos el estado a temporal
            // luego lo insertamos en ANDES
            let matchSisaResult: any = await matchSisa(pac);
            let porcentajeMatcheo: number = matchSisaResult.matcheos.matcheo;

            if (porcentajeMatcheo < 95) {
                pac.estado = 'temporal';
            } else {
                pac.nombre = matchSisaResult.matcheos.datosPaciente.nombre;
                pac.apellido = matchSisaResult.matcheos.datosPaciente.apellido;
            }
            let pacienteAndes = new paciente(pac.toObject());
            Auth.audit(pacienteAndes, (userScheduler as any));
            await pacienteAndes.save();
            await pacienteMpi.deleteOne({ _id: pac._id }).exec();
            const nuevoPac = JSON.parse(JSON.stringify(pacienteAndes));
            const connElastic = new ElasticSync();
            await connElastic.sync(nuevoPac);
            Logger.log(userScheduler, 'scheduler', 'regexCheck', {
                accion: 'fix nombres',
                id_paciente: pac._id,
                nombre_old: pacienteOld.nombre,
                apellido_old: pacienteOld.apellido,
                nombre: pac.nombre,
                apellido: pac.apellido
            });

        }).catch(err => {
            Logger.log(userScheduler, 'scheduler', 'regexCheck', {
                accion: 'error',
                error: err
            });
            done();
        });
        done();

    } catch (err) {
        Logger.log(userScheduler, 'scheduler', 'regexCheck', {
            accion: 'error',
            error: err
        });
        done();
    }
}
