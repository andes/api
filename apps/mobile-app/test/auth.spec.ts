import * as mongoose from 'mongoose';
import * as express from 'express';
import { initAPI } from '../../../initialize';
import { PacienteApp } from '../schemas/pacienteApp';
import { Auth } from '../../../auth/auth.class';


const request = require('supertest');
let app = express();

describe('MobileApp - login', () => {
    beforeAll((done) => {
        // [TODO] Change this to a promises style
        initAPI(app);
        done();
    });

    test('login sin campos debe devolver codigo 422', async () => {
        const response = await request(app).post('/api/modules/mobileApp/login');
        expect(response.statusCode).toBe(422);
    });

    test('login sin password debe devolver codigo 422', async () => {
        const response = await request(app).post('/api/modules/mobileApp/login').send({
            email: 'user1@g.com'
        });
        expect(response.statusCode).toBe(422);
        expect(response.body.message).toBe('Debe ingresar una clave');
    });

    test('login correcto', async () => {
        let mockAccount = {
            nombre: 'Perez',
            apellido: 'Juan',
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            activacionApp: true,
            comparePassword: jest.fn().mockResolvedValue(true),
            pacientes: []
        };

        const PacienteAppMock = jest.spyOn(PacienteApp, 'findOne');
        PacienteAppMock.mockResolvedValue(mockAccount);

        const generateTokenMock = jest.spyOn(Auth, 'generatePacienteToken');
        const response = await request(app).post('/api/modules/mobileApp/login').send({
            email: 'user@andes.gob.ar',
            password: 'asdasd'
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.token).toBeDefined();
        expect(response.body.user).toBeDefined();
        expect(response.body.user.email).toBe(mockAccount.email);
        expect(mockAccount.comparePassword).toBeCalledWith('asdasd');
        expect(PacienteAppMock).toBeCalledWith({ email: mockAccount.email });
        expect(generateTokenMock).toBeCalled();
        generateTokenMock.mockRestore();
        PacienteAppMock.mockRestore();
    });

    test('login con diferente password', async () => {
        let mockAccount = {
            nombre: 'Perez',
            apellido: 'Juan',
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            activacionApp: true,
            comparePassword: jest.fn().mockResolvedValue(false),
            pacientes: []
        };

        const PacienteAppMock = jest.spyOn(PacienteApp, 'findOne');
        PacienteAppMock.mockResolvedValue(mockAccount);

        const response = await request(app).post('/api/modules/mobileApp/login').send({
            email: 'user@andes.gob.ar',
            password: '123456'
        });
        expect(response.statusCode).toBe(422);
        expect(PacienteAppMock).toBeCalledWith({ email: mockAccount.email });
        expect(mockAccount.comparePassword).toBeCalledWith('123456');

        PacienteAppMock.mockRestore();
    });

    test('primer login sin nueva contraseña devuelve codigo 422', async () => {
        let mockAccount = {
            nombre: 'Perez',
            apellido: 'Juan',
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            activacionApp: false,
            comparePassword: jest.fn().mockResolvedValue(true),
            pacientes: []
        };

        const PacienteAppMock = jest.spyOn(PacienteApp, 'findOne');
        PacienteAppMock.mockResolvedValue(mockAccount);

        const response = await request(app).post('/api/modules/mobileApp/login').send({
            email: 'user@andes.gob.ar',
            password: 'asdasd'
        });
        expect(response.statusCode).toBe(422);
        expect(PacienteAppMock).toBeCalledWith({ email: mockAccount.email });
        expect(mockAccount.comparePassword).toBeCalledWith('asdasd');

        PacienteAppMock.mockRestore();
    });

    test('primer login exige cambio de contraseña correcto', async () => {
        let mockAccount = {
            nombre: 'Perez',
            apellido: 'Juan',
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            activacionApp: false,
            comparePassword: jest.fn().mockResolvedValue(true),
            pacientes: [],
            save: jest.fn().mockResolvedValue(true),
        };

        const PacienteAppMock = jest.spyOn(PacienteApp, 'findOne');
        PacienteAppMock.mockResolvedValue(mockAccount);

        const response = await request(app).post('/api/modules/mobileApp/login').send({
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            new_password: '123456'
        });
        expect(response.statusCode).toBe(200);
        expect(PacienteAppMock).toBeCalledWith({ email: mockAccount.email });
        expect(mockAccount.comparePassword).toBeCalledWith('asdasd');
        expect(mockAccount.save).toBeCalled();

        PacienteAppMock.mockRestore();
    });

    afterAll((done) => {
        // mongoose.disconnect(done);
        done();
    });

});


/**
 * Reset password
 */

let acc;
describe('MobileApp - reset password', () => {
    beforeAll((done) => {
        initAPI(app);
        done();
    });

    test('resetear contraseña sin email falla', async () => {
        const response = await request(app).post('/api/modules/mobileApp/olvide-password');
        expect(response.statusCode).toBe(422);
    });

    test('resetear contraseña con email correcto', async () => {
        let mockAccount = {
            nombre: 'Perez',
            apellido: 'Juan',
            email: 'user@andes.gob.ar',
            password: 'asdasd',
            activacionApp: true,
            comparePassword: jest.fn().mockResolvedValue(true),
            pacientes: [],
            save: jest.fn().mockResolvedValue(true),
            restablecerPassword : {}
        };

        const PacienteAppMock = jest.spyOn(PacienteApp, 'findOne');
        PacienteAppMock.mockResolvedValue(mockAccount);

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
        expect(PacienteAppMock).toBeCalledWith({ email: 'user@andes.gob.ar' });

        generarCodigoVerificacionMock.mockRestore();
        enviarCodigoCambioPasswordMock.mockRestore();
        PacienteAppMock.mockRestore();
    });

    test('token incorrecto al resetear contraseña', async () => {
        let mockAccount = {
            email: 'user@andes.gob.ar',
            activacionApp: true,
            pacientes: [],
            restablecerPassword : {
                codigo: '123345',
                fechaExpiracion: new Date(Date.now() - 1000 * 60 * 60)
            }
        };

        const PacienteAppMock = jest.spyOn(PacienteApp, 'findOne');
        PacienteAppMock.mockResolvedValue(mockAccount);

        const response = await request(app).post('/api/modules/mobileApp/reestablecer-password').send({
            email: 'user@andes.gob.ar',
            codigo: 'malcodigo',
            password: 'asdasd',
            password2: 'asdasd'
        });
        expect(response.statusCode).toBe(422);
        expect(PacienteAppMock).toBeCalledWith({ email: 'user@andes.gob.ar' });

        PacienteAppMock.mockRestore();
    });

    test('token expirado al resetear contraseña', async () => {
        let mockAccount = {
            email: 'user@andes.gob.ar',
            activacionApp: true,
            pacientes: [],
            restablecerPassword : {
                codigo: '123345',
                fechaExpiracion: new Date(Date.now() - 1000 * 60 * 60)
            }
        };

        const PacienteAppMock = jest.spyOn(PacienteApp, 'findOne');
        PacienteAppMock.mockResolvedValue(mockAccount);

        const response = await request(app).post('/api/modules/mobileApp/reestablecer-password').send({
            email: 'user@andes.gob.ar',
            codigo: '123345',
            password: 'asdasd',
            password2: 'asdasd'
        });
        expect(response.statusCode).toBe(422);
        expect(PacienteAppMock).toBeCalledWith({ email: 'user@andes.gob.ar' });
        PacienteAppMock.mockRestore();
    });

    test('resetear password correcta', async () => {
        let mockAccount = {
            email: 'user@andes.gob.ar',
            activacionApp: true,
            pacientes: [],
            password: '',
            restablecerPassword : {
                codigo: '123345',
                fechaExpiracion: new Date(Date.now() + 1000 * 60 * 60)
            },
            save: jest.fn().mockResolvedValue(true),
        };

        const PacienteAppMock = jest.spyOn(PacienteApp, 'findOne');
        PacienteAppMock.mockResolvedValue(mockAccount);

        const response = await request(app).post('/api/modules/mobileApp/reestablecer-password').send({
            email: 'user@andes.gob.ar',
            codigo: '123345',
            password: 'asdasd',
            password2: 'asdasd'
        });
        expect(response.statusCode).toBe(200);
        expect(PacienteAppMock).toBeCalledWith({ email: 'user@andes.gob.ar' });
        expect(mockAccount.save).toBeCalled();
        expect(mockAccount.password).toBe('asdasd');
        PacienteAppMock.mockRestore();
    });

    afterAll(async (done) => {
        // await PacienteApp.remove({ email: 'user@andes.gob.ar' });
        mongoose.disconnect(done);
        done();
    });

});
