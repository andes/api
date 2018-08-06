import * as mongoose from 'mongoose';
import * as express from 'express';
import { initAPI } from '../../../initialize';

const request = require('supertest');
let app = express();


describe('Test mobile app authentication', () => {
    beforeAll((done) => {
        // [TODO] Change this to a promises style
        initAPI(app);
        setTimeout(done, 2000);
    });

    test('Login with no filed must be 422 status', async () => {
        const response = await request(app).post('/api/modules/mobileApp/login');
        expect(response.statusCode).toBe(422);
    });

    test('Login with no form must be 422 status', async () => {
        const response = await request(app).post('/api/modules/mobileApp/login').send({
            'email': 'user1@g.com'
        });
        expect(response.statusCode).toBe(422);
        expect(response.body.message).toBe('Debe ingresar una clave');
    });

    afterAll((done) => {
        mongoose.disconnect(done);
    });

});

