import * as labsImport from '../modules/cda/controller/import-labs';
import { paciente as Paciente, pacienteMpi as PacienteMPI} from '../core/mpi/schemas/paciente';
import * as moment from 'moment';
import { Logger } from '../utils/logService';
import { log } from '../core/log/schemas/log';
import * as config from '../config.private';

function run() {

    log.find({
        'modulo': 'scheduler',
        'operacion': 'cda'
    }).sort({ fecha: -1 }).limit(1).then((docs) => {
        let skip = 0;
        let limit = 1000;

        if (docs.length) {
            let l: any = docs[0];
            if (l.datosOperacion.status === 'end') {
                return;
            }
            skip = l.datosOperacion.skip + limit;
        }
        let _stream = PacienteMPI.find({}, {nombre: 1, apellido: 1, fechaNacimiento: 1, documento: 1, sexo: 1}).skip(skip).limit(limit);
        _stream.then( async (pacientes: any[]) => {

            for (let pac of pacientes) {
                await labsImport.importarDatos(pac);
            }
            if (pacientes.length) {
                Logger.log(config.userScheduler, 'scheduler', 'cda', { limit, skip });
            } else {
                Logger.log(config.userScheduler, 'scheduler', 'cda', { limit, skip, status: 'end' });
            }

        });

    });

}

export = run;
