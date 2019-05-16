import * as PacienteCtr from './paciente.controller';
import { getPacientes, findPacientes, postMatch, postPacientes, patchPacientes, deletePacientes } from './paciente.routes';
const sinon = require('sinon');

let req;
let res;
describe('MPI - Routes', () => {

    beforeEach(() => {
        req = {
            query: {},
            params: {},
            body: {}
        };
        res = {
            json: sinon.stub()
        };
    });

    afterEach(() => {

    });

    describe ('GET /pacientes', () => {

        it('with search query must call search', async () => {
            req.query.search = 'perez';
            const searchStub = sinon.stub(PacienteCtr, 'search');
            await getPacientes(req, res);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(searchStub, 'perez');
            searchStub.restore();
        });

        it('with other params must call findPaciente', async () => {
            req.query.nombre = 'perez';
            const searchStub = sinon.stub(PacienteCtr, 'findPaciente');
            await getPacientes(req, res);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(searchStub, req.query);
            searchStub.restore();
        });

    });

    describe ('GET /pacientes/:id', () => {

        it('must call findById', async () => {
            const next = sinon.stub();
            req.params.id = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'findById').returns({});
            await findPacientes(req, res, next);
            sinon.assert.calledOnce(res.json);
            sinon.assert.calledWith(searchStub, '123456');
            sinon.assert.notCalled(next);
            searchStub.restore();
        });

    });

    describe ('POST /pacientes/match', () => {

        it('must call suggest', async () => {
            req.body.documento = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns('RESULT');
            await postMatch(req, res);
            sinon.assert.calledWith(res.json, 'RESULT');
            sinon.assert.calledWith(searchStub, req.body);
            searchStub.restore();
        });

    });

    describe ('POST /pacientes', () => {

        it('paciente repetido must call suggest and abort', async () => {
            const next = sinon.stub();
            req.body.documento = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([{ _score: 1 }]);
            await postPacientes(req, res, next);
            sinon.assert.calledWith(next, 400);
            sinon.assert.calledWith(searchStub, req.body);
            searchStub.restore();
        });

        it('paciente no repetido must call createPaciente', async () => {
            const next = sinon.stub();
            req.body.documento = '123456';

            const createStub = sinon.stub(PacienteCtr, 'createPaciente').returns('RESULT');
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([]);
            await postPacientes(req, res, next);
            sinon.assert.calledWith(res.json, 'RESULT');
            sinon.assert.calledWith(searchStub, req.body);
            sinon.assert.calledWith(createStub, req.body, req);
            sinon.assert.notCalled(next);

            searchStub.restore();
            createStub.restore();
        });

    });

    describe ('PATCH /pacientes/:id', () => {

        it('find succes and not suggest', async () => {
            req.params.id = '123456';
            req.body.documento = '123456';
            req.body.estado = 'validado';
            const next = sinon.stub();
            const findResult = { db: 'andes', paciente: { nombre: 'juan' } };

            const findStub = sinon.stub(PacienteCtr, 'findById').returns(findResult);
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([]);
            const updateStub = sinon.stub(PacienteCtr, 'updatePaciente').returns('RESULT');
            const saveStub = sinon.stub(PacienteCtr, 'savePaciente').returns('OK');

            await patchPacientes(req, res, next);

            sinon.assert.calledWith(findStub, '123456');
            sinon.assert.calledWith(searchStub, req.body);
            sinon.assert.calledWith(updateStub, findResult.paciente, req.body);
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
            const next = sinon.stub();
            const findResult = { db: 'andes', paciente: { nombre: 'juan' } };

            const findStub = sinon.stub(PacienteCtr, 'findById').returns(findResult);
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([{ _score: 1 }]);
            const updateStub = sinon.stub(PacienteCtr, 'updatePaciente').returns('RESULT');
            const saveStub = sinon.stub(PacienteCtr, 'savePaciente').returns('OK');

            await patchPacientes(req, res, next);

            sinon.assert.notCalled(updateStub);
            sinon.assert.notCalled(saveStub);
            sinon.assert.calledWith(findStub, '123456');
            sinon.assert.calledWith(searchStub, req.body);
            sinon.assert.calledWith(next, 400);

            searchStub.restore();
            findStub.restore();
            updateStub.restore();
            saveStub.restore();
        });

        it('not found', async () => {
            req.params.id = '123456';
            req.body.documento = '123456';
            req.body.estado = 'validado';
            const next = sinon.stub();
            const findResult = { db: 'andes', paciente: { nombre: 'juan' } };

            const findStub = sinon.stub(PacienteCtr, 'findById').returns(null);
            const searchStub = sinon.stub(PacienteCtr, 'suggest').returns([{ _score: 1 }]);
            const updateStub = sinon.stub(PacienteCtr, 'updatePaciente').returns('RESULT');
            const saveStub = sinon.stub(PacienteCtr, 'savePaciente').returns('OK');

            await patchPacientes(req, res, next);

            sinon.assert.notCalled(updateStub);
            sinon.assert.notCalled(saveStub);
            sinon.assert.calledWith(findStub, '123456');
            sinon.assert.notCalled(searchStub);
            sinon.assert.calledWith(next, 400);

            searchStub.restore();
            findStub.restore();
            updateStub.restore();
            saveStub.restore();
        });


    });

    describe ('DELETE /pacientes/:id', () => {

        it('must call deletePaciente', async () => {
            const next = sinon.stub();
            const findResult = { db: 'andes', paciente: { nombre: 'juan' } };
            req.params.id = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'findById').returns(findResult);
            const deleteStub = sinon.stub(PacienteCtr, 'deletePaciente').returns('RESULT');

            await deletePacientes(req, res, next);

            sinon.assert.calledWith(res.json, 'RESULT');
            sinon.assert.calledWith(searchStub, '123456');
            sinon.assert.calledWith(deleteStub, findResult.paciente, req);
            sinon.assert.notCalled(next);
            searchStub.restore();
            deleteStub.restore();

        });

        it('find fail', async () => {
            const next = sinon.stub();
            req.params.id = '123456';
            const searchStub = sinon.stub(PacienteCtr, 'findById').returns(null);
            const deleteStub = sinon.stub(PacienteCtr, 'deletePaciente').returns('RESULT');

            await deletePacientes(req, res, next);

            sinon.assert.notCalled(res.json);
            sinon.assert.calledWith(searchStub, '123456');
            sinon.assert.notCalled(deleteStub);
            sinon.assert.calledWith(next, 400);
            searchStub.restore();
            deleteStub.restore();

        });

    });

});
