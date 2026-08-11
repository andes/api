import * as mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

export function makeFs() {
    return new GridFSBucket(mongoose.connection.db, {
        bucketName: 'ProfesionalesImagenes'
    });
}
