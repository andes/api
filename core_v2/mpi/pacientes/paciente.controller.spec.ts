import { assert, expect } from 'chai';
import * as PacienteModule from './paciente.schema';
import { findById, createPaciente, savePaciente, search, matching, updatePaciente, suggest } from './paciente.controller';
import * as log from '@andes/log';
import * as PacienteTxModule from './pacienteTx';
import { ImportMock } from 'ts-mock-imports';

const sinon = require('sinon');
require('sinon-mongoose');

let PacienteMock;
let PacienteMockMpi;

describe('Paciente controller', () => {
    beforeEach(() => {
        PacienteMock = sinon.mock(PacienteModule.Paciente);
        PacienteMockMpi = sinon.mock(PacienteModule.PacienteMpi);

    });
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

        it('paciente encontrado en MPI con projeccion de campos', async () => {
            const pacienteMpi = { id: '2', nombre: 'pruebaMpi'};

            const mock = PacienteMock.expects('findById').withArgs(pacienteMpi.id);
            const selectMockPaciente = mock.chain('select').withArgs('nombre apellido');
            mock.chain('exec').resolves(null);

            const mock2 = PacienteMockMpi.expects('findById').withArgs(pacienteMpi.id);
            const selectMockPacienteMpi = mock2.chain('select').withArgs('nombre apellido');
            mock2.chain('exec').resolves(pacienteMpi);

            const pacienteEncontradoMpi = await findById(pacienteMpi.id, { fields: 'nombre apellido' });
            assert.equal(pacienteEncontradoMpi.db, 'mpi');
            assert.equal(pacienteEncontradoMpi.paciente.id, pacienteMpi.id);
            sinon.assert.calledOnce(selectMockPaciente);
            sinon.assert.calledOnce(selectMockPacienteMpi);
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
            assert.equal(pacienteEncontrado, null);
        });

    });
    afterEach(() => {
        PacienteMock.restore();
        PacienteMockMpi.restore();
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
            mockElasticPaciente = ImportMock.mockStaticClass(PacienteTxModule, 'PacienteTx');
        });
        it('paciente creado con datos básicos', async () => {
            let paciente = { nombre: 'test', apellido: 'testMpi', documento: '1', sexo: 'masculino', genero: 'masculino' , estado: 'temporal'};
            mockPaciente.set('_id', '12345567780');
            mockPaciente.set('nombre', paciente.nombre);

            const createStub = mockElasticPaciente.mock('create', true);
            const logstub = sinon.stub(log, 'log').callsFake(null);

            const patientCreated = await createPaciente(paciente as any, req);
            sinon.assert.calledOnce(log.log);
            sinon.assert.calledOnce(saveStub);
            sinon.assert.calledOnce(startTransactionStub);
            sinon.assert.calledOnce(commitTransactionStub);
            sinon.assert.notCalled(abortTransactionStub);
            sinon.assert.calledWith(setStub, paciente);
            sinon.assert.calledOnce(createStub);
            assert.equal(patientCreated.nombre, paciente.nombre);
            logstub.restore();
            createStub.reset();
        });

        afterEach(() => {
            mockPaciente.restore();
            mockPacienteStatic.restore();
            mockElasticPaciente.restore();
        });

    });


});

describe('Paciente Controller', () => {
    let mockElasticPaciente;
    describe('savePaciente', () => {
        let mockPaciente;
        let mockPacienteStatic;
        let req;
        let startTransactionStub, commitTransactionStub, abortTransactionStub;
        beforeEach(() => {
            startTransactionStub = sinon.stub();
            commitTransactionStub = sinon.stub();
            abortTransactionStub = sinon.stub();

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
            mockElasticPaciente = ImportMock.mockStaticClass(PacienteTxModule, 'PacienteTx');
        });

        afterEach(() => {
            mockElasticPaciente.restore();
            mockPacienteStatic.restore();
        });

        it('paciente actualizado', async () => {
            let paciente = { _id: 1,  nombre: 'test', apellido: 'update', documento: '1', sexo: 'masculino', genero: 'masculino' , estado: 'temporal'};
            mockPaciente = sinon.mock(new PacienteModule.Paciente(paciente));

            mockPaciente.expects('toObject').once();
            mockPaciente.expects('save').once();
            mockPaciente.expects('modifiedPaths').once();
            mockPaciente.expects('sincroniza')
            .resolves(true).once();

            const syncStub = mockElasticPaciente.mock('sync', true);
            sinon.stub(log, 'log').callsFake(null);

            const patientUpdated = await savePaciente(mockPaciente.object, req);
            sinon.assert.calledOnce(log.log);
            sinon.assert.calledOnce(syncStub);
            sinon.assert.calledOnce(startTransactionStub);
            sinon.assert.calledOnce(commitTransactionStub);
            sinon.assert.notCalled(abortTransactionStub);

        });
    });

    describe('updatePaciente', () => {
        it('paciente temporal puede cambiar todo', () => {
            let pacTemp = {
                nombre: 'carlos',
                apellido: 'gabriel',
                documento: '33333333',
                sexo: 'masculino',
                genero: 'masculino',
                estado: 'temporal',
                fechaNacimiento: new Date()
            };
            const paciente = new PacienteModule.Paciente(pacTemp);

            updatePaciente(paciente, { estado: 'validado', fechaNacimiento: null });

            assert.equal(paciente.estado, 'validado');
            assert.equal(paciente.documento, '33333333');
            assert.equal(paciente.fechaNacimiento, null);
        });

        it('paciente validado no puede cambiar documento', () => {
            let pacTemp = {
                nombre: 'carlos',
                apellido: 'gabriel',
                documento: '33333333',
                sexo: 'masculino',
                genero: 'masculino',
                estado: 'validado',
                fechaNacimiento: new Date()
            };
            const paciente = new PacienteModule.Paciente(pacTemp);

            updatePaciente(paciente, { estado: 'validado', documento: '1234567', fechaNacimiento: null });

            assert.equal(paciente.estado, 'validado');
            assert.equal(paciente.documento, '33333333');
            expect(paciente.fechaNacimiento).to.not.equal(null);
        });

    });

    describe('search', () => {
        beforeEach(() => {
            mockElasticPaciente = ImportMock.mockStaticClass(PacienteTxModule, 'PacienteTx');
        });

        afterEach(() => {
            mockElasticPaciente.restore();
        });

        it('simplequery search', async () => {
            const syncStub = mockElasticPaciente.mock('search', []);
            const founds = await search('simplequery', { documento: '34934522' });
            sinon.assert.calledWith(syncStub, sinon.match({ query: { simple_query_string: {} } }));
            // sinon.assert.calledOnce(syncStub);
            assert.equal(founds.length, 0);
        });

        it('multimatch search', async () => {
            const syncStub = mockElasticPaciente.mock('search', []);
            const founds = await search('multimatch', { documento: '34934522' });
            sinon.assert.calledWith(syncStub, sinon.match({ query: { bool: { must: { multi_match: {} } } } }));
            assert.equal(founds.length, 0);
        });

        it('multimatch search', async () => {
            const syncStub = mockElasticPaciente.mock('search', []);
            const founds = await search('suggest', { documento: '34934522' });
            sinon.assert.calledWith(syncStub, sinon.match({ query: { bool: { must: { match: {} } } } }));
            assert.equal(founds.length, 0);
        });

    });
});
describe('Paciente Controller', () => {
    describe('Matching', () => {
        beforeEach(() => {

        });
        it('Debería matchear al 0.55', () => {
            let pacienteA = {
                documento: '302569851',
                nombre: 'Gozalobbb',
                apellido: 'Carranza',
                fechaNacimiento: new Date('01-01-1980'),
                sexo: 'masculino',
                genero: 'masculino',
                estado: 'temporal'
            };

            let pacienteB = {
                documento: '35',
                nombre: 'Gonzalo',
                apellido: 'Carranza',
                fechaNacimiento: new Date('01-01-1980'),
                sexo: 'masculino',
                genero: 'masculino',
                estado: 'temporal'
            };

            const valor = matching(pacienteA, pacienteB);
            assert.equal(valor, 0.55);

        });
    });
});

