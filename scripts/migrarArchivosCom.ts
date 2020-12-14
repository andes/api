import { Derivaciones } from '../modules/centroOperativoMedico/schemas/derivaciones.schema';
import { readFile } from '../modules/centroOperativoMedico/controllers/comStore';
import * as configPrivate from '../config.private';
import { AndesDrive } from '@andes/drive';
import { userScheduler } from '../config.private';
let dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

// Recorre todas las derivaciones y sus adjuntos migrando aquellos que no se encuentran en el  drive
async function MigrarAdjuntosDerivacion() {

    let derivaciones: any[] = await Derivaciones.find({}).sort({ createdAt: 1 });
    for (const derivacion of derivaciones) {
        await migrarHistorialDerivacion(derivacion);
        for (const adjunto of derivacion.adjuntos) {
            const fileDrive = await AndesDrive.find(adjunto.id);
            if (!fileDrive) {
                try {
                    const archivo = await readFile(adjunto.id);
                    await AndesDrive.writeFile(archivo, dataLog);
                } catch (e) {
                    return;
                }
            }
        }
    }
}

async function migrarHistorialDerivacion(derivacion) {
    for (const movimiento of derivacion.historial) {
        if (movimiento.adjuntos) {
            for (const adjunto of movimiento.adjuntos) {
                const fileDrive = await AndesDrive.find(adjunto.id);
                if (!fileDrive) {
                    try {
                        const archivo = await readFile(adjunto.id);
                        await AndesDrive.writeFile(archivo, dataLog);
                    } catch (e) {
                        return;
                    }
                }
            }
        }
    }
}

async function run(done) {
    AndesDrive.setup(configPrivate.Drive);
    await MigrarAdjuntosDerivacion();
    done();
}

export = run;
