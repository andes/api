import { MongoMemoryServer } from 'mongodb-memory-server-global';
import * as mongoose from 'mongoose';
import { createSalaEspera, ingresarPaciente, egresarPaciente, listarSalaEspera } from './sala-espera.controller';
import { SalaEspera, SalaEsperaSnapshot } from './sala-espera.schema';
import moment = require('moment');

const REQMock: any = {
    user: {
        usuario: { nombre: 'JUAN' },
        organizacion: { nombre: 'CASTRO' }
    }
};

let mongoServer: any;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

let paciente1 = createPaciente('10000000');
let paciente2 = createPaciente('20000000');
let internacion1 = new mongoose.Types.ObjectId();
let internacion2 = new mongoose.Types.ObjectId();
let organizacionId = new mongoose.Types.ObjectId();

beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    const mongoUri = await mongoServer.getConnectionString();
    mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Internacion - Sala Espera', () => {
    test('create sala', async () => {
        const sala = await createSalaEspera(
            {
                nombre: 'sala',
                organizacion: { id: organizacionId, nombre: 'castro' },
                ambito: 'internacion',
                estado: 'disponible',
                sectores: [],
                unidadOrganizativas: [],
            },
            REQMock
        );
        expect(sala.nombre).toBe('sala');
        expect(sala.createdBy.nombre).toBe('JUAN');
        expect(sala.createdBy.organizacion.nombre).toBe('CASTRO');
        const snap = await SalaEsperaSnapshot.count({});
        expect(snap).toBe(1);
        await SalaEspera.deleteMany({});
        await SalaEsperaSnapshot.deleteMany({});
    });

    test('secuencia de alta baja y listado', async () => {
        const sala = await createSala();
        await ingresarPaciente(
            sala.id,
            {
                paciente: paciente1,
                ambito: 'internacion',
                idInternacion: internacion1,
                fecha: moment().subtract(3, 'h').toDate()
            },
            REQMock
        );

        await ingresarPaciente(
            sala.id,
            {
                paciente: paciente2,
                ambito: 'internacion',
                idInternacion: internacion2,
                fecha: moment().subtract(2, 'h').toDate()
            },
            REQMock
        );

        await egresarPaciente(
            sala.id,
            {
                paciente: paciente2,
                ambito: 'internacion',
                idInternacion: internacion2,
                fecha: moment().subtract(1, 'h').toDate()
            },
            REQMock
        );

        const pacientes = await listarSalaEspera({ organizacion: organizacionId, fecha: new Date() });
        expect(pacientes.length).toBe(1);


        const pacientes2 = await listarSalaEspera({ organizacion: organizacionId, fecha: moment().subtract(1, 'h').subtract(10, 'minutes').toDate() });
        expect(pacientes2.length).toBe(2);

        const pacientes3 = await listarSalaEspera({ organizacion: organizacionId, fecha: moment().subtract(2, 'h').subtract(10, 'minutes').toDate() });
        expect(pacientes3.length).toBe(1);


        const pacientes4 = await listarSalaEspera({ organizacion: organizacionId, fecha: moment().subtract(3, 'h').subtract(10, 'minutes').toDate() });
        expect(pacientes4.length).toBe(0);


    });

});

async function createSala() {
    return createSalaEspera(
        {
            nombre: 'sala',
            organizacion: { id: organizacionId, nombre: 'castro' },
            ambito: 'internacion',
            estado: 'disponible',
            sectores: [],
            unidadOrganizativas: [],
        },
        REQMock
    );
}

function createPaciente(documento) {
    return { id: new mongoose.Types.ObjectId(), documento, nombre: documento, apellido: documento };
}
