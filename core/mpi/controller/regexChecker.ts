
import { ElasticSync } from '../../../utils/elasticSync';
import { pacienteMpi, paciente } from '../schemas/paciente';
import { userScheduler } from '../../../config.private';
import { Auth } from '../../../auth/auth.class';
const regtest = /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ ']+/;
import * as mongoose from 'mongoose';
export async function regexChecker(done) {
    try {

        let cursor = await pacienteMpi.find({ $or: [{ nombre: { $regex: regtest } }, { apellido: { $regex: regtest } }] }).cursor();
        let countPacienteError = 0;
        await cursor.eachAsync(async (pac: any) => {
            let band = regtest.test(pac.nombre);
            band = band || regtest.test(pac.apellido);
            // console.log('------------------------------------------------------------------------>>>', band);
            if (band) {
                console.log(pac.nombre, pac.apellido, pac.documento, pac._id);
                countPacienteError = countPacienteError + 1;

                // Obtenemos el paciente con errores desde MPI , lo borramos y le cambiamos el estado a temporal
                // luego lo insertamos en ANDES

                pac.estado = 'temporal';
                let pacienteAndes = new paciente(pac.toObject());
                Auth.audit(pacienteAndes, (userScheduler as any));
                console.log(1);

                try {
                    await pacienteAndes.save();
                    console.log('borrando....', pac._id);
                    await pacienteMpi.deleteOne({ _id: pac._id }).exec();
                    const nuevoPac = JSON.parse(JSON.stringify(pacienteAndes));
                    const connElastic = new ElasticSync();
                    await connElastic.sync(nuevoPac);
                } catch (error) {
                    console.log('ERROR', error);
                }

            }
        });
        console.log('----------------------------------------------------------FIN----------------------------------------------------------', countPacienteError);
        done();

    } catch (error) {
        console.log('ERROR', error);
    }
}
