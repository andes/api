import * as mongoose from 'mongoose';
import * as express from 'express';
import { initAPI } from '../../../initialize';
import { PacienteApp } from '../schemas/pacienteApp';
import { Auth } from '../../../auth/auth.class';


const request = require('supertest');
let app = express();

describe('MobileApp - Login', () => {
    beforeAll((done) => {
        // [TODO] Change this to a promises style
        initAPI(app).then(() => {
            done();
        });
    });

    beforeEach(async () => {
        await PacienteApp.remove({ email: 'user@andes.gob.ar' });
    });

    test('login sin campoes debe devolver codigo 422', async () => {
        const response = await request(app).post('/api/modules/mobileApp/login');
        expect(response.statusCode).toBe(422);
    });

    test('login sin password debe devolver codigo 422', async () => {
        const response = await request(app).post('/api/modules/mobileApp/login').send({
            'email': 'user1@g.com'
        });
        expect(response.statusCode).toBe(422);
        expect(response.body.message).toBe('Debe ingresar una clave');
    });

    test('login correcto', async () => {
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

    test('login con diferente password', async () => {
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

    test('primer login sin nueva contraseña devuelve codigo 422', async () => {
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

    test('primer login exige cambio de contraseña correcto', async () => {
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
        });
    });

    afterAll((done) => {
        mongoose.disconnect(done);
    });

});


/**
 * Reset password
 */

let acc;
describe('MobileApp - reset password', () => {
    beforeAll((done) => {
        initAPI(app);
        setTimeout(async () => {

            acc = new PacienteApp({
                nombre: 'Perez',
                apellido: 'Juan',
                email: 'user@andes.gob.ar',
                password: 'asdasd',
                activacionApp: true
            });
            await acc.save();

            done();
        }, 2000);
    });

    test('resetear contraseña sin email falla', async () => {
        const response = await request(app).post('/api/modules/mobileApp/olvide-password');
        expect(response.statusCode).toBe(422);
    });

    test('resetear contraseña con email correcto', async () => {

        const authController = require('../controller/AuthController');

        const generarCodigoVerificacionMock = jest.spyOn(authController, 'generarCodigoVerificacion');
        const enviarCodigoCambioPasswordMock = jest.spyOn(authController, 'enviarCodigoCambioPassword');

        enviarCodigoCambioPasswordMock.mockImplementation(() => {
            return true;
        });

        const response = await request(app).post('/api/modules/mobileApp/olvide-password').send({
            email: 'user@andes.gob.ar'
        });
        expect(response.statusCode).toBe(200);

        expect(generarCodigoVerificacionMock).toBeCalled();
        expect(enviarCodigoCambioPasswordMock).toBeCalled();

        generarCodigoVerificacionMock.mockRestore();
        enviarCodigoCambioPasswordMock.mockRestore();
    });

    test('token incorrecto al resetear contraseña', async (done) => {
        await PacienteApp.findOneAndUpdate({ email: 'user@andes.gob.ar'}, { $set: {
            restablecerPassword: {
                codigo: '123345',
                fechaExpiracion: new Date(Date.now() + 1000 * 60 * 60)
            }
        }});

        const response = await request(app).post('/api/modules/mobileApp/reestablecer-password').send({
            email: 'user@andes.gob.ar',
            codigo: 'malcodigo',
            password: 'asdasd',
            password2: 'asdasd'
        });
        expect(response.statusCode).toBe(422);
        done();
    });

    test('token expirado al resetear contraseña', async (done) => {
        await PacienteApp.findOneAndUpdate({ email: 'user@andes.gob.ar'}, { $set: {
            restablecerPassword: {
                codigo: '123345',
                fechaExpiracion: new Date(Date.now() - 1000 * 60 * 60)
            }
        }});

        const response = await request(app).post('/api/modules/mobileApp/reestablecer-password').send({
            email: 'user@andes.gob.ar',
            codigo: '123345',
            password: 'asdasd',
            password2: 'asdasd'
        });
        expect(response.statusCode).toBe(422);
        done();
    });

    test('resetear password correcta', async (done) => {
        await PacienteApp.findOneAndUpdate({ email: 'user@andes.gob.ar'}, { $set: {
            restablecerPassword: {
                codigo: '123345',
                fechaExpiracion: new Date(Date.now() + 1000 * 60 * 60)
            }
        }});

        const response = await request(app).post('/api/modules/mobileApp/reestablecer-password').send({
            email: 'user@andes.gob.ar',
            codigo: '123345',
            password: 'asdasd',
            password2: 'asdasd'
        });
        expect(response.statusCode).toBe(200);

        let pactemp = await PacienteApp.findById(acc._id);

        pactemp.comparePassword('asdasd', async (_err, isMatch) => {
            expect(isMatch).toBe(true);
            done();
        });

    });

    afterAll(async (done) => {
        await PacienteApp.remove({ email: 'user@andes.gob.ar' });
        mongoose.disconnect(done);
    });

});
