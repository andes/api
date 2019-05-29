import { expect, assert } from 'chai';
import * as geocodeModule from './geocode';
import * as request from './request';
import * as sinon from 'sinon';

describe('geocode.ts', () => {

    describe('autocompletarDireccion', () => {

        it('success but no descriptions returns []', async () => {

            const p1 = {
                lat: -38.951643,
                lng: -68.059181
            };

            const res = { status: 'OK', predictions: [] };
            const reqStub = sinon.stub(request, 'requestHttp').resolves([200, res]);
            const response = await geocodeModule.autocompletarDireccion('avenida siempre viva 123');

            sinon.assert.calledWith(reqStub, sinon.match({ url: {}, qs: {}, json: true }));
            expect(response).to.be.instanceof(Array);
            expect(response).to.have.lengthOf(0);
            reqStub.restore();

        });

        it('success with descriptions', async () => {

            const p1 = {
                lat: -38.951643,
                lng: -68.059181
            };

            const res = { status: 'OK', predictions: [{ description: 'HOLA' }] };
            const reqStub = sinon.stub(request, 'requestHttp').resolves([200, res]);
            const response = await geocodeModule.autocompletarDireccion('avenida siempre viva 123');

            sinon.assert.calledWith(reqStub, sinon.match({ url: {}, qs: {}, json: true }));
            assert.equal(response[0], 'HOLA');
            reqStub.restore();

        });

    });

});

/**
 * [TODO] Agregar test de georeferenciar
 */
