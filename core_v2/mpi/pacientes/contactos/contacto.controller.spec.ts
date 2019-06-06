import { assert } from 'chai';
import * as ContactoModule from './../../../../shared/schemas/contacto';
import { contactoController } from '../contactos/contacto.controller';

const sinon = require('sinon');
require('sinon-mongoose');

let ContactoMock;

describe('MPI - Contacto controller', () => {

    describe('find ', () => {

        beforeEach(() => {
            ContactoMock = sinon.mock(ContactoModule.Contacto);

        });

        it('should get contacts by query', async () => {
            let contacto = { valor: '2995689', ranking: 25, id: 124 };
            let paciente = {
                id: '112', nombre: 'Maria', apellido: 'Perez', sexo: 'femenino', genero: 'femenino', estado: 'temporal', fechaNacimiento: new Date('01-01-1990'),
                contacto: [contacto]
            };
            ContactoMock
                .expects('findById').withArgs(paciente)
                .chain('exec')
                .resolves([contacto]);

            let contactos = contactoController.find((paciente as any), { valor: '^299' });
            assert.equal(contactos[0].id, contacto.id);
        });

        // it('should get a single contact', async () => {
        //     let contacto = { valor: '2995689', ranking: 25, id: '124' };
        //     let paciente = {
        //         id: '112', nombre: 'Maria', apellido: 'Perez', sexo: 'femenino', genero: 'femenino', estado: 'temporal', fechaNacimiento: new Date('01-01-1990'),
        //         contacto: [contacto]
        //     };
        //     ContactoMock
        //         .expects('findById').withArgs(paciente)
        //         .chain('exec')
        //         .resolves();

        //     let cto = contactoController.findById((paciente as any), contacto.id);

        // });

        afterEach(() => {
            ContactoMock.restore();
        });
    });
});
