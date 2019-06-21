import { PacienteCtr } from './paciente.controller';
import { expect } from 'chai';
import { get, find, post, match, patch, remove } from './paciente.routes';
const sinon = require('sinon');

let req;
let res;
describe('MPI - Routes', () => {

    beforeEach(() => {
        req = {
            query: {},
            params: {},
            body: {},
            apiOptions: sinon.stub()
        };
        res = {
            json: sinon.stub()
        };
    });

    afterEach(() => {

    });

    describe('GET /pacientes', () => {

        it('with search query must call search', async () => {
            req.query.search = 'perez';
            const searchStub = sinon.stub(PacienteCtr, 'search');
            await get(req, res);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(searchStub, 'perez');
            searchStub.restore();
        });

        it('with other params must call findPaciente', async () => {
            req.query.nombre = 'perez';
            const searchStub = sinon.stub(PacienteCtr, 'find');
            await get(req, res);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(searchStub, req.query);
            searchStub.restore();
        });

    });

    describe('GET /pacientes/:id', () => {

        it('must call findById', async () => {
            req.params.id = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'findById').returns({});
            try {
                await find(req, res);
            } catch (err) {
                expect(true).to.be.equal(false);
            }
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(searchStub, '123456');
            searchStub.restore();
        });

    });

    describe('POST /pacientes/match', () => {

        it('must call suggest', async () => {
            req.body.documento = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns('RESULT');
            await match(req, res);
            sinon.assert.calledWith(res.json, 'RESULT');
            sinon.assert.calledWith(searchStub, req.body);
            searchStub.restore();
        });

    });

    describe('POST /pacientes', () => {

        it('paciente repetido must call suggest and abort', async () => {
            req.body.documento = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([{ _score: 1 }]);
            try {
                await post(req, res);
            } catch (err) {
                expect(true).to.be.equal(true);
            }
            sinon.assert.calledWith(searchStub, req.body);
            searchStub.restore();
        });

        it('paciente no repetido must call newPaciente and store', async () => {
            req.body.documento = '123456';

            const newStub = sinon.stub(PacienteCtr, 'make').returns('RESULT');
            const storeStub = sinon.stub(PacienteCtr, 'store').returns('RESULT');
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([]);
            try {
                await post(req, res);
            } catch (err) {
                expect(true).to.be.equal(false);
            }
            sinon.assert.calledWith(res.json, 'RESULT');
            sinon.assert.calledWith(newStub, req.body);
            sinon.assert.calledWith(storeStub, 'RESULT', req);

            searchStub.restore();
            newStub.restore();
            storeStub.restore();

        });

    });

    describe('PATCH /pacientes/:id', () => {

        it('find succes and not suggest', async () => {
            req.params.id = '123456';
            req.body.documento = '123456';
            req.body.estado = 'validado';
            const next = sinon.stub();
            const findResult = { nombre: 'juan' };

            const findStub = sinon.stub(PacienteCtr, 'findById').returns(findResult);
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([]);
            const updateStub = sinon.stub(PacienteCtr, 'set').returns('RESULT');
            const saveStub = sinon.stub(PacienteCtr, 'store').returns('OK');
            try {
                await patch(req, res);
            } catch (err) {
                expect(true).to.be.equal(false);
            }

            sinon.assert.calledWith(findStub, '123456');
            sinon.assert.calledWith(searchStub, req.body);
            sinon.assert.calledWith(updateStub, findResult, req.body);
            sinon.assert.calledWith(saveStub, 'RESULT');
            sinon.assert.notCalled(next);
            searchStub.restore();
            findStub.restore();
            updateStub.restore();
            saveStub.restore();

        });

        it('find succes and suggest maus fail', async () => {
            req.params.id = '123456';
            req.body.documento = '123456';
            req.body.estado = 'validado';
            const findResult = { nombre: 'juan' };

            const findStub = sinon.stub(PacienteCtr, 'findById').returns(findResult);
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([{ _score: 1 }]);
            const updateStub = sinon.stub(PacienteCtr, 'set').returns('RESULT');
            const saveStub = sinon.stub(PacienteCtr, 'store').returns('OK');
            try {
                await patch(req, res);
            } catch (err) {
                expect(err.message).to.be.equal('paciente duplicado');
                expect(true).to.be.equal(true);
            }

            sinon.assert.notCalled(updateStub);
            sinon.assert.notCalled(saveStub);
            sinon.assert.calledWith(findStub, '123456');
            sinon.assert.calledWith(searchStub, req.body);

            searchStub.restore();
            findStub.restore();
            updateStub.restore();
            saveStub.restore();
        });

        it('not found', async () => {
            req.params.id = '123456';
            req.body.documento = '123456';
            req.body.estado = 'validado';

            const findStub = sinon.stub(PacienteCtr, 'findById').throws();
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([{ _score: 1 }]);
            const updateStub = sinon.stub(PacienteCtr, 'set').returns('RESULT');
            const saveStub = sinon.stub(PacienteCtr, 'store').returns('OK');

            try {
                await patch(req, res);
            } catch (err) {
                expect(true).to.be.equal(true);
            }

            sinon.assert.notCalled(updateStub);
            sinon.assert.notCalled(saveStub);
            sinon.assert.calledWith(findStub, '123456');
            sinon.assert.notCalled(searchStub);

            searchStub.restore();
            findStub.restore();
            updateStub.restore();
            saveStub.restore();
        });


    });

    describe('DELETE /pacientes/:id', () => {

        it('must call deletePaciente', async () => {
            const findResult = { nombre: 'juan' };
            req.params.id = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'findById').returns(findResult);
            const deleteStub = sinon.stub(PacienteCtr, 'remove').returns('RESULT');

            try {
                await remove(req, res);
            } catch (err) {
                expect(true).to.be.equal(false);
            }

            sinon.assert.calledWith(res.json, 'RESULT');
            sinon.assert.calledWith(searchStub, '123456');
            sinon.assert.calledWith(deleteStub, findResult, req);
            searchStub.restore();
            deleteStub.restore();

        });

        it('find fail', async () => {
            req.params.id = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'findById').throws();
            const deleteStub = sinon.stub(PacienteCtr, 'remove').returns('RESULT');

            try {
                await remove(req, res);
            } catch (err) {
                expect(true).to.be.equal(true);
            }

            sinon.assert.notCalled(res.json);
            sinon.assert.calledWith(searchStub, '123456');
            sinon.assert.notCalled(deleteStub);
            searchStub.restore();
            deleteStub.restore();

        });

    });

});
