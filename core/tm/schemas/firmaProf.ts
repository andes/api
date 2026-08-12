import * as mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

export function makeFsFirma() {
    return new GridFSBucket(mongoose.connection.db, {
        bucketName: 'ProfesionalesFirma'
    });
}
