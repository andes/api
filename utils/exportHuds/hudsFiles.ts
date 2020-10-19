import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
const { createBucket } = require('mongoose-gridfs');


export function getHUDSExportarModel() {
    const HudsFilesSchema = createBucket({
        bucketName: 'HUDSExportar',
        collectionName: 'HUDSExportar',
        mongooseConnection: mongoose.connection
    });
    return HudsFilesSchema;
}

export function readFile(id): Promise<any> {
    return new Promise(async (resolve, reject) => {
        try {
            const idFile = Types.ObjectId(id);
            const hudsFiles = getHUDSExportarModel();
            const file = await hudsFiles.findOne({ _id: idFile });
            const stream = hudsFiles.readFile({ _id: idFile });
            resolve({
                file,
                stream
            });

        } catch (e) {
            return reject(e);
        }
    });
}
