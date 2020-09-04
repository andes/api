import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { ingresarPaciente } from './sala-comun.controller';
import { getObjectId, getFakeRequest, setupUpMongo } from '@andes/unit-test';
import { createSnapshotSalaComun } from './sala-comun-snapshot';
import { SalaComunSnapshot } from './sala-comun.schema';
import { SalaComunCtr } from './sala-comun.routes';


setupUpMongo();
const REQMock = getFakeRequest();

const paciente1 = createPaciente('10000000');
const paciente2 = createPaciente('20000000');


describe('Internacion - Sala Espera - Job', () => {

    test('secuencia de alta baja y listado', async () => {
        const sala = await createSala();
        await ingresarPaciente(
            sala.id,
            {
                paciente: paciente1,
                ambito: 'internacion',
                idInternacion: getObjectId('internacion1'),
                fecha: moment().subtract(2, 'd').toDate()
            },
            REQMock
        );

        await ingresarPaciente(
            sala.id,
            {
                paciente: paciente2,
                ambito: 'internacion',
                idInternacion: getObjectId('internacion2'),
                fecha: moment().toDate()
            },
            REQMock
        );

        const startOfDay = moment().startOf('day').toDate();
        await createSnapshotSalaComun(startOfDay);

        const snaps = await SalaComunSnapshot.find();
        expect(snaps.length).toBe(2);

        const ultimoSnap = snaps[1];
        expect(ultimoSnap.ocupacion.length).toBe(1);
        expect(ultimoSnap.ocupacion[0].paciente.id.toString()).toBe(paciente1.id.toString());


    });

});

export async function createSala() {
    return await SalaComunCtr.create(
        {
            nombre: 'sala',
            organizacion: { id: getObjectId('5f5246dba3e1603a69f768d5'), nombre: 'castro' },
            ambito: 'internacion',
            estado: 'disponible',
            sectores: [],
            unidadOrganizativas: [],
        },
        REQMock
    );
}

export function createPaciente(documento) {
    return { id: new mongoose.Types.ObjectId(), documento, nombre: documento, apellido: documento };
}
