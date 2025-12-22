/* eslint-disable no-console */
import { Request } from '@andes/api-tool';
import { MongoMemoryServer } from 'mongodb-memory-server-global';
import * as mongoose from 'mongoose';

const sha1 = require('sha1');

export const getObjectId = (name: string): mongoose.Types.ObjectId => {
    if (name === '') {
        throw new Error('Name cannot be empty');
    }
    const hash = sha1(name);
    return new mongoose.Types.ObjectId(hash.substring(0, 24));
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
        try {
            console.log('[unit-testing] setupUpMongo: creando mongo in-memory');
            mongoServer = await MongoMemoryServer.create();
            const mongoUri = mongoServer.getUri ? mongoServer.getUri() : (mongoServer.getConnectionString ? mongoServer.getConnectionString() : undefined);
            console.log('[unit-testing] setupUpMongo: mongo uri=', mongoUri);
            await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
            console.log('[unit-testing] setupUpMongo: mongoose conectado');
        } catch (error) {
            console.error('Error al iniciar mongoServer: ', error && error.stack ? error.stack : error);
            throw error; // Para que las pruebas no continúen si no se pudo iniciar mongoServer
        }
    });

    afterAll(async () => {
        try {
            console.log('[unit-testing] teardownMongo: desconectando mongoose');
            await mongoose.disconnect();
            if (mongoServer && typeof mongoServer.stop === 'function') {
                await mongoServer.stop();
                console.log('[unit-testing] teardownMongo: mongoServer detenido correctamente');
            } else {
                console.warn('[unit-testing] teardownMongo: mongoServer no definido o no tiene método stop:', !!mongoServer);
            }
        } catch (error) {
            console.error('Error al detener mongoServer: ', error && error.stack ? error.stack : error);
        }
    });
}
