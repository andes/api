import * as moment from 'moment';
import { ingresarPaciente } from './sala-comun.controller';
import { getObjectId, getFakeRequest, setupUpMongo } from '@andes/unit-test';
import { createSnapshotSalaComun } from './sala-comun-snapshot';
import { SalaComunSnapshot } from './sala-comun.schema';
import { createPaciente, createSala, createUnidadOrganizativa } from '../test-utils';


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
                fecha: moment().subtract(2, 'd').toDate(),
                unidadOrganizativa: createUnidadOrganizativa('123456789')
            },
            REQMock
        );

        await ingresarPaciente(
            sala.id,
            {
                paciente: paciente2,
                ambito: 'internacion',
                idInternacion: getObjectId('internacion2'),
                fecha: moment().toDate(),
                unidadOrganizativa: createUnidadOrganizativa('123456789')
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

