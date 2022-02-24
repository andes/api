import { Request } from '@andes/api-tool';
import { MongoMemoryServer } from 'mongodb-memory-server-global';
import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
import { Connections } from '../../connections';


const sha1 = require('sha1');

export const getObjectId = (name: string): Types.ObjectId => {
    if (name === '') {
        throw new Error('Name cannot be empty');
    }
    const hash = sha1(name);
    return new Types.ObjectId(hash.substring(0, 24));
};

export function getFakeRequest(): Request {
    return {
        user: {
            usuario: { nombre: 'JUAN' },
            organizacion: { nombre: 'CASTRO' }
        }
    } as any;
}

/**
 * Levanta una instancia de mongo en la memoría
 * y configura mongoose.
 */
export function setupUpMongo() {
    let mongoServer: any;
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        mongoose.connect(mongoUri);
        Connections.logs = mongoose.connection;
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });
}
