import * as mongoose from 'mongoose';
import * as express from 'express';
import { initAPI } from '../../../initialize';
import { PacienteApp } from '../schemas/pacienteApp';
import { Auth } from '../../../auth/auth.class';

const request = require('supertest');
let app = express();

describe('Test mobile app authentication', () => {
    beforeAll((done) => {
        // [TODO] Change this to a promises style
        initAPI(app);
        setTimeout(done, 2000);
    });

    beforeEach(async () => {
        await PacienteApp.remove({ email: 'user@andes.gob.ar' });
    });

    test('Login with no field must be 422 status', async () => {
        const response = await request(app).post('/api/modules/mobileApp/login');
        expect(response.statusCode).toBe(422);
    });

    test('password miss = 422', async () => {
        const response = await request(app).post('/api/modules/mobileApp/login').send({
            'email': 'user1@g.com'
        });
        expect(response.statusCode).toBe(422);
        expect(response.body.message).toBe('Debe ingresar una clave');
    });

    test('login success', async () => {
        let pac = new PacienteApp({
            nombre: 'Perez',
            apellido: 'Juan',
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            activacionApp: true
        });
        pac = await pac.save();

        const generateTokenMock = jest.spyOn(Auth, 'generatePacienteToken');
        const response = await request(app).post('/api/modules/mobileApp/login').send({
            'email': 'user@andes.gob.ar',
            password: 'asdasd'
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.token).toBeDefined();
        expect(response.body.user).toBeDefined();
        expect(response.body.user.email).toBe(pac.email);
        expect(generateTokenMock).toBeCalled();
        generateTokenMock.mockRestore();
    });

    test('login error', async () => {
        let pac = new PacienteApp({
            nombre: 'Perez',
            apellido: 'Juan',
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            activacionApp: true
        });
        pac = await pac.save();

        const response = await request(app).post('/api/modules/mobileApp/login').send({
            'email': 'user@andes.gob.ar',
            password: 'asdasdasdasd'
        });
        expect(response.statusCode).toBe(422);

    });

    test('prevent first login without new password', async () => {
        let pac = new PacienteApp({
            nombre: 'Perez',
            apellido: 'Juan',
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            activacionApp: false
        });
        pac = await pac.save();

        const response = await request(app).post('/api/modules/mobileApp/login').send({
            'email': 'user@andes.gob.ar',
            password: 'asdasd'
        });
        expect(response.statusCode).toBe(422);
    });

    test('first login with new password', async (done) => {
        let pac = new PacienteApp({
            nombre: 'Perez',
            apellido: 'Juan',
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            activacionApp: false
        });
        pac = await pac.save();

        const response = await request(app).post('/api/modules/mobileApp/login').send({
            'email': 'user@andes.gob.ar',
            password: 'asdasd',
            new_password: '123456'
        });
        expect(response.statusCode).toBe(200);

        let pactemp = await PacienteApp.findById(pac._id);

        pactemp.comparePassword('123456', async (_err, isMatch) => {
            expect(isMatch).toBe(true);
            done();
        });
    });

    afterAll((done) => {
        mongoose.disconnect(done);
    });

});

