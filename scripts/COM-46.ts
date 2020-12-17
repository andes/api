import { Derivaciones } from '../modules/centroOperativoMedico/schemas/derivaciones.schema';
import { readFile } from '../modules/centroOperativoMedico/controllers/comStore';
import * as configPrivate from '../config.private';
import { AndesDrive, FileMetadata } from '@andes/drive';
import { userScheduler } from '../config.private';

// Recorre todas las derivaciones y sus adjuntos migrando aquellos que no se encuentran en el  drive
async function MigrarAdjuntosDerivacion() {

    const derivaciones: any[] = await Derivaciones.find({});

    for (const derivacion of derivaciones) {
        await migrarHistorialDerivacion(derivacion);
        for (const adjunto of derivacion.adjuntos) {
            const fileDrive = await AndesDrive.find(adjunto.id);
            if (!fileDrive) {
                try {
                    const archivo = await readFile(adjunto.id);
                    const stream = archivo.stream;
                    const metadata: FileMetadata = {
                        ...archivo.file,
                        origin: 'com'
                    };
                    await AndesDrive.writeFile(stream, metadata, userScheduler as any);
                } catch (e) {
                    // tslint:disable-next-line:no-console
                    console.error(e);
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
                        const stream = archivo.stream;
                        const metadata: FileMetadata = {
                            ...archivo.file,
                            origin: 'com'
                        };
                        await AndesDrive.writeFile(stream, metadata, userScheduler as any);
                    } catch (e) {
                        // tslint:disable-next-line:no-console
                        console.error(e);
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
