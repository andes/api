import { assert } from 'chai';
import {Paciente, PacienteMpi} from '../schemas/paciente';
import {findById} from './paciente';


require('sinon-mongoose');
const sinon = require('sinon');

describe('Paciente controller', () => {
    const PacienteMock = sinon.mock(Paciente);
    const PacienteMockMpi = sinon.mock(PacienteMpi);
    describe('FindById ', () => {
        it('paciente encontrado en Andes', async () => {
            let paciente = { id: '1', nombre: 'prueba'};
            PacienteMock
            .expects('findById').withArgs(paciente.id)
            .chain('exec')
            .resolves(paciente);

            PacienteMockMpi
            .expects('findById').never();

            let pacienteEncontrado = await findById(paciente.id);
            assert.equal(pacienteEncontrado.db, 'andes');
            assert.equal(pacienteEncontrado.paciente.id, paciente.id);
        });
    });
});

