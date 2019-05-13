import { ImportMock } from 'ts-mock-imports';
import * as ElasticModule from '@elastic/elasticsearch';
import { PacienteTx } from './pacienteTx';

import { assert, expect } from 'chai';
const sinon = require('sinon');

let paciente;
let mockPacienteTx;
describe('PacienteTx', () => {
    beforeEach(() => {
        paciente = {
            _id: '1234567890',
            nombre: 'Juan',
            apellido: 'Perez',
            toElastic: sinon.stub().returns({
                nombre: 'Juan',
                apellido: 'Perez'
            })
        };
        mockPacienteTx = ImportMock.mockClass(ElasticModule, 'Client');
    });
    afterEach(() => {
        mockPacienteTx.restore();
        paciente.toElastic.reset();
    });
    describe('create', () => {
        it('create return true', async () => {
            const saveStub = mockPacienteTx.mock('create', {
                body: {
                    created: true
                }
            });
            const bool = await PacienteTx.create(paciente as any);
            assert.equal(bool, true);
            sinon.assert.calledOnce(paciente.toElastic);
            sinon.assert.calledOnce(saveStub);
            saveStub.reset();
        });

        it('create return false', async () => {
            const saveStub = mockPacienteTx.mock('create', {
                body: {
                    created: false
                }
            });
            const bool = await PacienteTx.create(paciente as any);
            assert.equal(bool, false);
            sinon.assert.calledOnce(paciente.toElastic);
            sinon.assert.calledOnce(saveStub);
            saveStub.reset();
        });

        it('create not handler exception', async () => {
            const err = new TypeError('Error');
            const saveStub = mockPacienteTx.mock('create').throws(err);
            try {
                await PacienteTx.create(paciente as any);
                expect(true).to.be.equal(false);
            } catch (e) {
                expect(e).to.be.equal(err);
            }
            sinon.assert.calledOnce(saveStub);
            saveStub.reset();
        });
    });

    describe('delete', () => {
        it('delete return deleted', async () => {
            const saveStub = mockPacienteTx.mock('delete', {
                body: {
                    result: 'deleted'
                }
            });
            const result = await PacienteTx.delete(paciente as any);
            assert.equal(result, 'deleted');
            sinon.assert.calledOnce(saveStub);
            saveStub.reset();
        });

        it('delete return not_found', async () => {
            const saveStub = mockPacienteTx.mock('delete', {
                body: {
                    result: 'not_found'
                }
            });
            const result = await PacienteTx.delete(paciente as any);
            assert.equal(result, 'not_found');
            sinon.assert.calledOnce(saveStub);
            saveStub.reset();
        });

        it('delete not handler exception', async () => {
            const err = new TypeError('Error');
            const saveStub = mockPacienteTx.mock('delete').throws(err);
            try {
                await PacienteTx.delete(paciente as any);
                expect(true).to.be.equal(false);
            } catch (e) {
                expect(e).to.be.equal(err);
            }
            sinon.assert.calledOnce(saveStub);
            saveStub.reset();
        });
    });

    describe('update', () => {
        it('update return success', async () => {
            const deleteStub = sinon.stub(PacienteTx, 'delete');
            const createStub = sinon.stub(PacienteTx, 'create').returns(true);
            const result = await PacienteTx.update(paciente as any);
            sinon.assert.calledOnce(createStub);
            sinon.assert.calledOnce(deleteStub);
            expect(result).to.be.equal(true);
            deleteStub.restore();
            createStub.restore();
        });

        it('update not handler exception', async () => {
            const err = new TypeError('Error');
            const deleteStub = sinon.stub(PacienteTx, 'delete');
            const createStub = sinon.stub(PacienteTx, 'create').throws(err);

            try {
                await PacienteTx.update(paciente as any);
                expect(true).to.be.equal(false);
            } catch (e) {
                expect(e).to.be.equal(err);
            }
            sinon.assert.calledOnce(createStub);
            sinon.assert.calledOnce(deleteStub);
            deleteStub.restore();
            createStub.restore();
        });

    });

    describe('find', () => {
        it('not found return null', async () => {
            const findStub = mockPacienteTx.mock('search', {
                body: {
                    hits: {
                        hits: []
                    }
                }
            });
            const result = await PacienteTx.find(paciente._id);
            sinon.assert.calledWith(findStub, sinon.match({ q: '_id:' + paciente._id }));
            assert.equal(result, null);
            sinon.assert.calledOnce(findStub);
            findStub.reset();
        });

        it('with result return paciente object', async () => {
            const findStub = mockPacienteTx.mock('search', {
                body: {
                    hits: {
                        hits: [{
                            _id: paciente._id,
                            _source: paciente.toElastic()
                        }]
                    }
                }
            });
            const result = await PacienteTx.find(paciente._id);
            sinon.assert.calledWith(findStub, sinon.match({ q: '_id:' + paciente._id }));
            assert.equal(result._id, paciente._id);
            assert.equal(result.apellido, paciente.apellido);
            assert.equal(result.nombre, paciente.nombre);
            sinon.assert.calledOnce(findStub);
            findStub.reset();
        });


    });

    describe('search', () => {
        it('not result return []', async () => {
            const findStub = mockPacienteTx.mock('search', {
                body: {
                    hits: {
                        hits: []
                    }
                }
            });
            const body = { term: 'nombre' };
            const result = await PacienteTx.search(body);
            sinon.assert.calledWith(findStub, sinon.match({ body }));
            assert.equal(result.length, 0);
            sinon.assert.calledOnce(findStub);
            findStub.reset();
        });

        it('with result return array of paciente object', async () => {
            const findStub = mockPacienteTx.mock('search', {
                body: {
                    hits: {
                        hits: [{
                            _id: paciente._id,
                            _source: paciente.toElastic()
                        }]
                    }
                }
            });
            const body = { term: 'nombre' };
            const result = await PacienteTx.search(body);
            sinon.assert.calledWith(findStub, sinon.match({ body }));
            assert.equal(result[0]._id, paciente._id);
            assert.equal(result[0].apellido, paciente.apellido);
            assert.equal(result[0].nombre, paciente.nombre);
            sinon.assert.calledOnce(findStub);
            findStub.reset();
        });


    });

});
