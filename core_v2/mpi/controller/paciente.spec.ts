import { assert } from 'chai';
import * as PacienteModule from '../schemas/paciente';
import {findById, createPaciente, updatePaciente} from './paciente';
import * as log from '@andes/log';
import * as ElasticSync from '../../../utils/elasticSync';
import { ImportMock } from 'ts-mock-imports';

const sinon = require('sinon');
require('sinon-mongoose');

describe('Paciente controller', () => {
    const PacienteMock = sinon.mock(PacienteModule.Paciente);
    const PacienteMockMpi = sinon.mock(PacienteModule.PacienteMpi);
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
        it('paciente encontrado en MPI', async () => {
            let pacienteMpi = { id: '2', nombre: 'pruebaMpi'};
            PacienteMock
            .expects('findById').withArgs(pacienteMpi.id)
            .chain('exec')
            .resolves(null);

            PacienteMockMpi
            .expects('findById').withArgs(pacienteMpi.id)
            .chain('exec')
            .resolves(pacienteMpi);

            let pacienteEncontradoMpi = await findById(pacienteMpi.id);
            assert.equal(pacienteEncontradoMpi.db, 'mpi');
            assert.equal(pacienteEncontradoMpi.paciente.id, pacienteMpi.id);

        });
        it('paciente no encontrado', async () => {
            let paciente = {id: '3', nombre: 'prueba'};
            PacienteMock
            .expects('findById').withArgs(paciente.id)
            .chain('exec')
            .resolves(null);

            PacienteMockMpi
            .expects('findById').withArgs(paciente.id)
            .chain('exec')
            .resolves(null);

            let pacienteEncontrado = await findById(paciente.id);
            assert.equal(pacienteEncontrado.paciente, null);

        });
    });
});

describe('Paciente Controller', () => {
    describe('Create', () => {
        let mockPaciente;
        let saveStub;
        let setStub;
        let mockPacienteStatic;
        let req;
        let mockElasticPaciente;
        let startTransactionStub, commitTransactionStub, abortTransactionStub;
        beforeEach(() => {
            startTransactionStub = sinon.stub();
            commitTransactionStub = sinon.stub();
            abortTransactionStub = sinon.stub();
            mockPaciente = ImportMock.mockClass(PacienteModule, 'Paciente');
            saveStub = mockPaciente.mock('save', true );
            setStub = mockPaciente.mock('set', true);
            mockPacienteStatic = ImportMock.mockOther(PacienteModule.Paciente, 'db');
            mockPacienteStatic.set( {
                startSession ()  {
                    return {
                        startTransaction: startTransactionStub,
                        commitTransaction: commitTransactionStub,
                        abortTransaction: abortTransactionStub
                    };
                }
            } as any);

            req = {
                user: {
                    usuario: {
                        nombre: 'Test',
                        apellido: 'Test Andes'
                    },
                    organizacion: {
                        nombre: 'Andes'
                    }
                },
            };
            mockElasticPaciente = ImportMock.mockClass(ElasticSync, 'ElasticSync');
        });
        it('paciente creado con datos básicos', async () => {
            let paciente = { nombre: 'test', apellido: 'testMpi', documento: '1', sexo: 'masculino', genero: 'masculino' , estado: 'temporal'};
            mockPaciente.set('_id', '12345567780');
            mockPaciente.set('nombre', paciente.nombre);

            const createStub = mockElasticPaciente.mock('create', true);
            sinon.stub(log, 'log').callsFake(null);

            const patientCreated = await createPaciente(paciente, req);
            sinon.assert.calledOnce(log.log);
            sinon.assert.calledOnce(saveStub);
            sinon.assert.calledOnce(startTransactionStub);
            sinon.assert.calledOnce(commitTransactionStub);
            sinon.assert.notCalled(abortTransactionStub);
            sinon.assert.calledWith(setStub, paciente);
            sinon.assert.calledWith(createStub, '12345567780');
            assert.equal(patientCreated.nombre, paciente.nombre);
        });

        // it('throws si save de paciente no se realiza', async () => {
        //     let paciente = { nombre: 'test', apellido: 'testMpi', documento: '1', sexo: 'masculino', genero: 'masculino' , estado: 'temporal'};
        //     mockPaciente.set('_id', '12345567780');
        //     mockPaciente.set('nombre', paciente.nombre);

        //     const createStub = mockElasticPaciente.mock('create', true);
        //     sinon.stub(log, 'log').callsFake(null);

        //     const patientCreated = await createPaciente(paciente, req);
        //     sinon.assert.calledOnce(log.log);
        //     sinon.assert.calledOnce(saveStub);
        //     sinon.assert.calledOnce(startTransactionStub);
        //     sinon.assert.calledOnce(abortTransactionStub);
        //     sinon.assert.notCalled(commitTransactionStub);
        //     sinon.assert.calledWith(setStub, paciente);
        //     sinon.assert.calledWith(createStub, '12345567780');
        // });


    });


});

describe('Paciente Controller', () => {
    describe('Update', () => {
        let mockPaciente;
        let saveStub;
        let mockPacienteStatic;
        let req;
        let mockElasticPaciente;
        let startTransactionStub, commitTransactionStub, abortTransactionStub;
        beforeEach(() => {
            startTransactionStub = sinon.stub();
            commitTransactionStub = sinon.stub();
            abortTransactionStub = sinon.stub();
            // mockPaciente = ImportMock.mockClass(PacienteModule, 'Paciente');

            // saveStub = mockPaciente.mock('save', true );
            mockPacienteStatic = ImportMock.mockOther(PacienteModule.Paciente, 'db');
            mockPacienteStatic.set( {
                startSession ()  {
                    return {
                        startTransaction: startTransactionStub,
                        commitTransaction: commitTransactionStub,
                        abortTransaction: abortTransactionStub
                    };
                }
            } as any);

            req = {
                user: {
                    usuario: {
                        nombre: 'Test',
                        apellido: 'Test Andes'
                    },
                    organizacion: {
                        nombre: 'Andes'
                    }
                },
            };
            mockElasticPaciente = ImportMock.mockClass(ElasticSync, 'ElasticSync');
        });

        it('paciente actualizado', async () => {
            let paciente = { _id: 1,  nombre: 'test', apellido: 'update', documento: '1', sexo: 'masculino', genero: 'masculino' , estado: 'temporal'};
            mockPaciente = sinon.mock(new PacienteModule.Paciente(paciente));

            mockPaciente.expects('toObject').once();
            mockPaciente.expects('save').once();
            mockPaciente.expects('modifiedPaths').once();
            mockPaciente.expects('sincroniza')
            .resolves(true).once();

            const syncStub = mockElasticPaciente.mock('_sync', true);
            sinon.stub(log, 'log').callsFake(null);

            const patientUpdated = await updatePaciente(mockPaciente.object, req);
            // console.log(patientUpdated);
            sinon.assert.calledOnce(log.log);
            sinon.assert.calledOnce(syncStub);
            sinon.assert.calledOnce(startTransactionStub);
            sinon.assert.calledOnce(commitTransactionStub);
            sinon.assert.notCalled(abortTransactionStub);

        });
    });

});


// });
