import { assert, expect } from 'chai';
import * as PacienteModule from './paciente.schema';
import { MongoQuery } from '@andes/query-builder';

import { findById, store, search, matching, set, suggest, find } from './paciente.controller';
import * as log from '@andes/log';
import * as PacienteTxModule from './pacienteTx';
import { ImportMock } from 'ts-mock-imports';

const sinon = require('sinon');
require('sinon-mongoose');

let PacienteMock;

describe('MPI - Paciente controller', () => {

    describe('findbyid ', () => {

        beforeEach(() => {
            PacienteMock = sinon.mock(PacienteModule.Paciente);

        });

        it('paciente encontrado en Andes', async () => {
            let paciente = { id: '1', nombre: 'prueba' };
            PacienteMock
                .expects('findById').withArgs(paciente.id)
                .chain('exec')
                .resolves(paciente);

            let pacienteEncontrado = await findById(paciente.id);
            assert.equal(pacienteEncontrado.id, paciente.id);
        });

        it('paciente no encontrado', async () => {
            let paciente = { id: '3', nombre: 'prueba' };
            PacienteMock
                .expects('findById').withArgs(paciente.id)
                .chain('exec')
                .resolves(null);

            let pacienteEncontrado = await findById(paciente.id);
            assert.equal(pacienteEncontrado, null);
        });

        afterEach(() => {
            PacienteMock.restore();
        });
    });

    describe('store', () => {
        let mockPaciente;
        let mockPacienteStatic;
        let req;
        let mockElasticPaciente;
        let startTransactionStub, commitTransactionStub, abortTransactionStub;
        let paciente;

        beforeEach(() => {
            startTransactionStub = sinon.stub();
            commitTransactionStub = sinon.stub();
            abortTransactionStub = sinon.stub();
            paciente = { nombre: 'test', apellido: 'testMpi', documento: '1', sexo: 'masculino', genero: 'masculino', estado: 'temporal' };
            mockPaciente = sinon.mock(new PacienteModule.Paciente(paciente));
            mockPacienteStatic = ImportMock.mockOther(PacienteModule.Paciente, 'db');
            mockPacienteStatic.set({
                startSession() {
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
            const createStub = mockElasticPaciente.mock('create', true);
            const logstub = sinon.stub(log, 'log').callsFake(null);

            mockPaciente.expects('save').chain('exec').resolves('RESULT');

            const patientCreated = await store(mockPaciente.object as any, req);
            sinon.assert.calledOnce(log.log);
            sinon.assert.calledOnce(startTransactionStub);
            sinon.assert.calledOnce(commitTransactionStub);
            sinon.assert.notCalled(abortTransactionStub);

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

    describe('set', () => {

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

            set(paciente, { estado: 'validado', fechaNacimiento: null });

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

            set(paciente, { estado: 'validado', documento: '1234567', fechaNacimiento: null });

            assert.equal(paciente.estado, 'validado');
            assert.equal(paciente.documento, '33333333');
            expect(paciente.fechaNacimiento).to.not.equal(null);
        });

    });

    describe('search', () => {
        let mockElasticPaciente;
        beforeEach(() => {
            mockElasticPaciente = ImportMock.mockStaticClass(PacienteTxModule, 'PacienteTx');
        });

        afterEach(() => {
            mockElasticPaciente.restore();
        });

        it('multimatch search', async () => {
            const syncStub = mockElasticPaciente.mock('search', []);
            const founds = await search('34934522');
            sinon.assert.calledWith(syncStub, sinon.match({ query: { bool: { must: { multi_match: {} } } } }));
            assert.equal(founds.length, 0);
        });

    });

    describe('suggest', () => {
        let mockElasticPaciente;
        beforeEach(() => {
            mockElasticPaciente = ImportMock.mockStaticClass(PacienteTxModule, 'PacienteTx');
        });

        afterEach(() => {
            mockElasticPaciente.restore();
        });

        it('return creo matching', async () => {
            const syncStub = mockElasticPaciente.mock('search', []);
            const founds = await suggest({ documento: '34934522' });
            sinon.assert.calledWith(syncStub, sinon.match({ query: { bool: { must: { match: {} } } } }));
            assert.equal(founds.length, 0);
        });

    });

    describe('match', () => {
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

    describe('find ', () => {
        beforeEach(() => {
            PacienteMock = sinon.mock(PacienteModule.Paciente);
        });
        afterEach(() => {
            PacienteMock.restore();
        });
        it('Búsqueda por documento', async () => {
            let condicion = { documento: '11111111' };
            const mock = PacienteMock.expects('find').withArgs(condicion);
            mock.chain('select').withArgs('nombre apellido');
            mock.chain('exec').resolves([]);
            let pacientesEncontrado = await find(condicion, { fields: 'nombre apellido' });
            expect(pacientesEncontrado).to.eql([]);

        });

        it('Búsqueda parcial por apellido', async () => {
            const mock = PacienteMock.expects('find');
            mock.chain('select').withArgs('nombre apellido');
            mock.chain('exec').resolves([]);

            let pacientesEncontrado = await find({ apellido: '^GONZ' }, { fields: 'nombre apellido' });
            mock.withArgs(sinon.match.has('nombre', { $regexp: '' }));
            expect(pacientesEncontrado).to.eql([]);

        });

        it('Búsqueda por identificadores', async () => {
            let condicion = {
                identificadores: ['ANDES|125785']
            };
            let elem = {
                $and: [{
                    $and: [{
                        identificadores: {
                            $elemMatch: {
                                entidad: 'ANDES',
                                valor: '125785'
                            }
                        }
                    }]
                }]
            };
            const mock = PacienteMock.expects('find').withArgs(elem);
            mock.chain('select').withArgs('documento nombre apellido');
            mock.chain('exec').resolves([]);
            let pacientesEncontrado = await find(condicion);
            expect(pacientesEncontrado).to.eql([]);
        });

    });

});

