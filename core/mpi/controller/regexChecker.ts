
import { ElasticSync } from '../../../utils/elasticSync';
import { paciente } from '../schemas/paciente';
import { userScheduler } from '../../../config.private';
import { Auth } from '../../../auth/auth.class';
const regtest = /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ ']+/;
import { sisa } from '@andes/fuentes-autenticas';
import { sisa as sisaConfig } from '../../../config.private';
import { log } from '@andes/log';
import { logKeys } from './../../../config';
import { Matching } from '@andes/match';
import * as config from '../../../config';
import moment = require('moment');

/**
 * Busca pacientes validados con errores de charset en nombre y apellido,
 *  intenta corregir los errores con SISA y si no puede los deja como temporales en la bd de temporales.
 * @export
 * @param {*} done
 */
export async function regexChecker(done) {
    try {

        let cursor = await paciente.find({ $or: [{ nombre: { $regex: regtest } }, { apellido: { $regex: regtest }, estado: 'validado' }] }).limit(100).cursor();
        let countPacienteError = 0;

        await cursor.eachAsync(async (pac: any) => {
            const pacienteOld = pac;
            countPacienteError = countPacienteError + 1;
            let pacienteSisa: any = await sisa(pac, sisaConfig);
            const pacSisa: any = {
                documento: pacienteSisa.nroDocumento,
                nombre: pacienteSisa.nombre,
                apellido: pacienteSisa.apellido,
                fechaNacimiento: moment(pacienteSisa.fechaNacimiento, 'YYYY-MM-DD'),
                sexo: (pacienteSisa.sexo === 'M') ? 'masculino' : 'femenino'
            };
            const pacOld: any = {
                documento: pac.documento,
                nombre: pac.nombre,
                apellido: pac.apellido,
                fechaNacimiento: moment(pac.fechaNacimiento, 'YYYY-MM-DD'),
                sexo: pac.sexo
            };
            let match = new Matching();
            const weights = config.mpi.weightsDefault;
            const porcentajeMatcheo: number = match.matchPersonas(pacOld, pacSisa, weights, config.algoritmo);

            if (porcentajeMatcheo < 0.95) {
                pac.estado = 'temporal';
            } else {
                pac.nombre = pacienteSisa.nombre;
                pac.apellido = pacienteSisa.apellido;
            }
            let pacienteAndes = new paciente(pac.toObject());
            Auth.audit(pacienteAndes, (userScheduler as any));
            await pacienteAndes.save();
            const nuevoPac = JSON.parse(JSON.stringify(pacienteAndes));
            const connElastic = new ElasticSync();
            await connElastic.sync(nuevoPac);
            log(userScheduler, logKeys.regexChecker.key, pac, logKeys.regexChecker.operacion, pac, pacienteOld);
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
