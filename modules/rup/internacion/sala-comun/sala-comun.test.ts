import { MongoMemoryServer } from 'mongodb-memory-server-global';
import * as mongoose from 'mongoose';
import { ingresarPaciente, egresarPaciente, listarSalaComun } from './sala-comun.controller';
import { SalaComun, SalaComunSnapshot } from './sala-comun.schema';
import moment = require('moment');
import { SalaComunCtr } from './sala-comun.routes';
import { getObjectId, getFakeRequest, setupUpMongo } from '@andes/unit-test';
import { createPaciente, createSala } from '../test-utils';

const REQMock = getFakeRequest();
const paciente1 = createPaciente('10000000');
const paciente2 = createPaciente('20000000');

setupUpMongo();

describe('Internacion - Sala Espera', () => {
    test('create sala', async () => {
        const sala = await SalaComunCtr.create(
            {
                nombre: 'sala',
                organizacion: { id: getObjectId('organizacion'), nombre: 'castro' },
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
        const snap = await SalaComunSnapshot.count({});
        expect(snap).toBe(1);
        await SalaComun.deleteMany({});
        await SalaComunSnapshot.deleteMany({});
    });

    test('secuencia de alta baja y listado', async () => {
        const sala = await createSala();
        await ingresarPaciente(
            sala.id,
            {
                paciente: paciente1,
                ambito: 'internacion',
                idInternacion: getObjectId('internacion1'),
                fecha: moment().subtract(3, 'h').toDate()
            },
            REQMock
        );

        await ingresarPaciente(
            sala.id,
            {
                paciente: paciente2,
                ambito: 'internacion',
                idInternacion: getObjectId('internacion2'),
                fecha: moment().subtract(2, 'h').toDate()
            },
            REQMock
        );

        await egresarPaciente(
            sala.id,
            {
                paciente: paciente2,
                ambito: 'internacion',
                idInternacion: getObjectId('internacion2'),
                fecha: moment().subtract(1, 'h').toDate()
            },
            REQMock
        );

        const pacientes = await listarSalaComun({ organizacion: getObjectId('organizacion'), fecha: new Date() });
        expect(pacientes.length).toBe(1);


        const pacientes2 = await listarSalaComun({ organizacion: getObjectId('organizacion'), fecha: moment().subtract(1, 'h').subtract(10, 'minutes').toDate() });
        expect(pacientes2.length).toBe(2);

        const pacientes3 = await listarSalaComun({ organizacion: getObjectId('organizacion'), fecha: moment().subtract(2, 'h').subtract(10, 'minutes').toDate() });
        expect(pacientes3.length).toBe(1);


        const pacientes4 = await listarSalaComun({ organizacion: getObjectId('organizacion'), fecha: moment().subtract(3, 'h').subtract(10, 'minutes').toDate() });
        expect(pacientes4.length).toBe(0);


    });

});

