import * as mongoose from 'mongoose';
import * as express from 'express';
import { initAPI } from '../../../initialize';
import { PacienteApp } from '../schemas/pacienteApp';
import { Auth } from '../../../auth/auth.class';


const request = require('supertest');
let app = express();

let account;
let token;

describe('MobileApp - devices', () => {
    beforeAll((done) => {
        initAPI(app).then(async () => {
            account = new PacienteApp({
                nombre: 'Perez',
                apellido: 'Juan',
                email: 'devices@andes.gob.ar',
                password: 'asdasd',
                activacionApp: true
            });
            await account.save();
            token = Auth.generatePacienteToken(String(account._id), account.nombre + ' ' + account.apellido, account.email, account.pacientes, account.permisos);
            done();
        });
    });

    beforeEach(async () => {

    });

    test('Check ruta protegida', async () => {
        const response = await request(app).post('/api/modules/mobileApp/devices/register');
        expect(response.statusCode).toBe(401);
    });

    test('registrar dispositivo sin campos', async () => {
        const response = await request(app).post('/api/modules/mobileApp/devices/register').set('Authorization', `JWT ${token}`);
        expect(response.statusCode).toBeGreaterThan(403);
    });

    test('registro exitoso de un dispositivo', async () => {
        const response = await request(app).post('/api/modules/mobileApp/devices/register')
                                            .set('Authorization', `JWT ${token}`)
                                            .send({
                                                device_id: '123456789',
                                                device_type: 'Android',
                                                app_version: 1
                                            });
        expect(response.statusCode).toBe(200);
        expect(response.body.device_id).toBe('123456789');

        // Mismo device_id no tiene que crear un nuevo campo
        const response2 = await request(app).post('/api/modules/mobileApp/devices/register')
                                            .set('Authorization', `JWT ${token}`)
                                            .send({
                                                device_id: '123456789',
                                                device_type: 'Android',
                                                app_version: 1
                                            });
        expect(response.body.id).toBe(response2.body.id);

    });

    test('actualizacion de los datos del dispositivo', async () => {
        let accout = await PacienteApp.findOneAndUpdate({ email: 'devices@andes.gob.ar'}, { $set: {
            devices: [{
                device_id: '123456789',
                device_type: 'Android',
                app_version: 1
            }]
        }}, { new: true });
        let newDevice = JSON.parse(JSON.stringify(accout.devices[0]));
        newDevice.id = newDevice._id;
        newDevice.device_id = '999999999';

        const response = await request(app).post('/api/modules/mobileApp/devices/update')
                                            .set('Authorization', `JWT ${token}`)
                                            .send({ device: newDevice });

        expect(response.statusCode).toBe(200);
        expect(response.body.device_id).toBe('999999999');

        let pactemp = await PacienteApp.findById(accout._id);
        expect(pactemp.devices[0].device_id).toBe('999999999');
    });

    test('eliminar un dispositivo', async () => {
        let accout = await PacienteApp.findOneAndUpdate({ email: 'devices@andes.gob.ar'}, { $set: {
            devices: [{
                device_id: '123456789',
                device_type: 'Android',
                app_version: 1
            }]
        }}, { new: true });
        let newDevice = JSON.parse(JSON.stringify(accout.devices[0]));
        newDevice.id = newDevice._id;

        const response = await request(app).post('/api/modules/mobileApp/devices/delete')
                                            .set('Authorization', `JWT ${token}`)
                                            .send({ id: newDevice._id });

        expect(response.statusCode).toBe(200);
        let pactemp = await PacienteApp.findById(accout._id);
        expect(pactemp.devices.length).toBe(0);
    });


    afterAll(async (done) => {
        await PacienteApp.remove({ email: 'devices@andes.gob.ar' });
        mongoose.disconnect(done);
    });

});
