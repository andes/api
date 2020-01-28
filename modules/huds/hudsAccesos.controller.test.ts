import * as mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { search } from './hudsAccesos.controller';
import { hosts } from '../../config.private';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
let mongoServer: any;
beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    const mongoUri = hosts.mongoDB_main.host;
    mongoose.connect(mongoUri);
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});


test('obtener accesos huds de paciente por cierto usuario', async () => {
    let filtros = {
        paciente: '5dcc8861775ba5ba132fcb2e',
        'usuario.id': '59e76172b7c39e57a13b38c5'
    };

    const accesos: any = await search(filtros);
    expect([
        accesos[0].fecha.toBeDefined,
        accesos[0].usuario.toBeDefined,
        accesos[0].matricula.toBeDefined,
        accesos[0].organizacion.toBeDefined
    ]);
});
