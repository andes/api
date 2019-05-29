import { expect, assert } from 'chai';
import * as geoNodeModule from './geonode';
import * as request from './request';
import * as sinon from 'sinon';

describe('geonode.ts', () => {
    describe('geonode', () => {
        it('success', async () => {
            const p1 = {
                lat: -38.951643,
                lng: -68.059181
            };

            const res = { a: 1 };
            const reqStub = sinon.stub(request, 'requestHttp').resolves([200, res]);
            const response = await geoNodeModule.geonode(p1);

            sinon.assert.calledWith(reqStub, sinon.match({ url: {}, qs: {}, json: true }));
            assert.equal(response, res);
            reqStub.restore();

        });

        it('fail must return null', async () => {
            const p1 = {
                lat: -38.951643,
                lng: -68.059181
            };

            const res = { a: 1 };
            const reqStub = sinon.stub(request, 'requestHttp').resolves([400, res]);
            const response = await geoNodeModule.geonode(p1);

            sinon.assert.calledWith(reqStub, sinon.match({ url: {}, qs: {}, json: true }));
            assert.equal(response, null);
            reqStub.restore();
        });
    });

    describe('getBarrio', () => {
        it('success', async () => {
            const p1 = {
                lat: -38.951643,
                lng: -68.059181
            };

            const res = { features: [{ properties: { NOMBRE: 'BARRIO SUR' } }] };
            const geonodeStub = sinon.stub(geoNodeModule, 'geonode').resolves(res);
            const response = await geoNodeModule.getBarrio(p1);

            sinon.assert.calledWith(geonodeStub, p1);
            assert.equal(response, 'BARRIO SUR');
            geonodeStub.restore();

        });

        it('fail must return null', async () => {
            const p1 = {
                lat: -38.951643,
                lng: -68.059181
            };

            const res = { features: [] };
            const geonodeStub = sinon.stub(geoNodeModule, 'geonode').resolves(res);
            const response = await geoNodeModule.getBarrio(p1);

            sinon.assert.calledWith(geonodeStub, p1);
            assert.equal(response, null);
            geonodeStub.restore();
        });
    });
});
