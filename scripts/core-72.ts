
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { makeFs, readFile } from '../core/tm/controller/file-storage';
import { AndesDrive, FileMetadata } from '@andes/drive';
import { Drive, userScheduler } from '../config.private';
import * as mongoose from 'mongoose';

async function run2(done) {
    // const prestaciones = Prestacion.find().cursor({ batchSize: 100 });
    // let i = 0;
    // let t = 0;
    // for await (const prestacion of prestaciones) {
    //     i++;
    //     if (i % 1000 === 0) {
    //         console.log(i);
    //     }
    //     const registros = prestacion.getRegistros();
    //     for (const registro of registros) {
    //         if (registro?.valor?.documentos) {
    //             for (const documento of registro?.valor?.documentos) {
    //                 t++;
    //                 // console.log(documento.id);
    //                 if (t % 100 === 0) {
    //                     console.log('T = ', t);
    //                 }
    //             }


    //         }
    //     }

    // }

    userScheduler.user.usuario.apellido = 'migracion rup-drive';

    AndesDrive.setup(Drive);
    const RUPStore = makeFs('RupStore');
    const files = RUPStore.find();

    let i = 0;
    for await (const file of files) {

        const _stream = RUPStore.readFile({ _id: file._id });

        const metadata: FileMetadata = {
            _id: file._id,
            ...file,
            origin: 'rup'
        };

        if (file.migrado) {
            continue;
        }

        const ff = await AndesDrive.writeFile(_stream, metadata, userScheduler as any);

        const COL = await mongoose.connection.db.collection('RupStore.files');

        await COL.updateOne(
            { _id: file._id },
            {
                $set: {
                    migrado: true,
                    driveID: ff._id
                }
            }
        );

        i++;
        if (i % 100 === 0) {
            console.log(i);
        }

    }
    done();
}


async function run(done) {
    setTimeout(() => { run2(done); }, 100);
}

export = run;
