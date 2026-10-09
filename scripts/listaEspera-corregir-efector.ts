import * as mongoose from 'mongoose';
import { AuthUsers } from '../auth/schemas/authUsers';
import { Organizacion } from '../core/tm/schemas/organizacion';
import { listaEspera } from '../modules/turnos/schemas/listaEspera';
import { demandaLog } from '../modules/turnos/citasLog';
import { userScheduler } from '../config.private';

async function run(done) {
    try {
        await recorrerListaEspera();
        done();
    } catch (error) {
        done(error);
    }
}

async function recorrerListaEspera() {

    try {
        const listaEsperaSinOrg: any[] = await listaEspera.find({ 'demandas.organizacion.nombre': '' });
        for (const listaespera of listaEsperaSinOrg) {
            for (const demanda of listaespera.demandas) {
                if (!demanda.organizacion.nombre) {
                    const id = mongoose.Types.ObjectId(demanda.organizacion.id);
                    const org = await Organizacion.findById(id);
                    if (org) {
                        demanda.organizacion.nombre = org.nombre;
                    }
                }
            }
            await listaEspera.findByIdAndUpdate(listaespera.id, listaespera);
        }
        const authUsersSinOrg: any[] = await AuthUsers.find({ 'organizaciones.nombre': '' });
        for (const user of authUsersSinOrg) {
            for (const organizacion of user.organizaciones) {
                if (!organizacion.nombre) {
                    const id = mongoose.Types.ObjectId(organizacion.id);
                    const org = await Organizacion.findById(id);
                    if (org) {
                        organizacion.nombre = org.nombre;
                    }
                }
            }
            await AuthUsers.findByIdAndUpdate(user.id, user);
        }
    } catch (err) {
        await demandaLog.error('script corregir efector', {}, err, userScheduler);
    }
}

export = run;


