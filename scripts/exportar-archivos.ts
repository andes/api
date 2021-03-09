import { SeaweedAdapter } from '@andes/drive/adapters';
import { Drive } from '../config.private';
import { userScheduler } from '../config.private';
import { FileDescriptorModel } from '@andes/drive/file-descriptor/schemas';
import { FileDescriptor } from '@andes/drive/file-descriptor/controller';

const fs = require('fs');
const path = require('path');

async function run(done) {
    const directoryPath = path.join(__dirname, '..');
    const server = Drive.options.host;
    const port = Drive.options.port || '9333';
    const adapter = new SeaweedAdapter({ port, server });
    let weedClient = require("node-seaweedfs");
    const seaweedfs = new weedClient({ port, server });

    fs.readdir(directoryPath, function (err, files) {
        if (err) {
            // tslint:disable-next-line:no-console
            console.log('No se puede escanear el directorio: ' + err);
        }
        files.forEach(async function (filename) {
            try {
                if (filename.length == 24) {
                    const filePath = path.join(directoryPath, '/' + filename);
                    seaweedfs.write(filePath).then(async function (fileInfo) {
                        const realid = fileInfo.fid;
                        // tslint:disable-next-line:no-console
                        console.log('file: ', realid);
                        const data: any = {
                            real_id: realid,
                            adapter: adapter.name,
                        };
                        const metadata: any = await FileDescriptorModel.findOne({ 'real_id': filename });
                        await FileDescriptor.update(metadata._id, data, userScheduler);
                    }).catch(function (err) {
                        // tslint:disable-next-line:no-console
                        console.log('Error al guardar el archivo en seaweed', err);
                    });
                }
            } catch (err) {
                // tslint:disable-next-line:no-console
                console.log('Error al procesar los archivos', err);
            }

        });
        //done();
    });

}

export = run;