import { pacienteApp } from '../schemas/pacienteApp';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as agenda from '../../turnos/schemas/agenda';
import { paciente } from '../../../core/mpi/schemas/paciente';
import * as agendaCtrl from '../../turnos/controller/agenda';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import { INotification, PushClient } from '../controller/PushClient';
import { deviceSchema, deviceModel } from '../schemas/device';
let router = express.Router();

/**
 * register new device for pacienteApp
 * 
 * @param device_id {String}
 * @param device_type {String}
 * @param app_version {String}
 */

router.post('/devices/register', function (req: any, res, next) {
    let token: string = req.headers.authorization.substring(4);
    let user_id = req.user.usuario.id;
    pacienteApp.findById(user_id, function (err, user: any) {
        if (err) {
            return res.status(422).send({ message: 'user_invalid' });
        }

        let device_data = {
            device_id: req.body.device_id,
            device_type: req.body.device_type,
            app_version: req.body.app_version,
            session_id: token
        };
        let device = new deviceModel(device_data);
        user.devices.push(device);
        user.save((err, u) => {
            if (err) {
                next(err);
            }
            res.json(device);
        });
    });
});

/**
 * Update device specification of pacienteApp
 * @param device {Object} {
 *      @param id {ObjectId}
 *      @param device_id {String}
 *      @param device_type {String}
 *      @param app_version {String}
 * }
 */

router.post('/devices/update', function (req: any, res, next) {
    let token: string = req.headers.authorization.substring(4);
    let user_id = req.user.usuario.id;
    pacienteApp.findById(user_id, function (err, user: any) {
        if (err) {
            return res.status(422).send({ message: 'user_invalid' });
        }

        let device_data = req.body.device;
        let device = user.devices.id(device_data.id);
        device.app_version = device_data.app_version;
        device.device_id = device_data.device_id;
        device.device_type = device_data.device_type;
        device.session_id = token;

        user.save((err, u) => {
            if (err) {
                next(err);
            }
            res.json(device);
        });
    });
});

/**
 * Remove device from user 
 * @param id {ObjectId}
 */

router.post('/devices/delete', function (req: any, res, next) {
    let token: string = req.headers.authorization.substring(4);
    let user_id = req.user.usuario.id;

    pacienteApp.findById(user_id, function (err, user: any) {
        if (err) {
            return res.status(422).send({ message: 'user_invalid' });
        }

        user.devices.pull({ '_id': new mongoose.Types.ObjectId(req.body.id) });
        user.save((err, u) => {
            if (err) {
                next(err);
            }

            res.json({ message: 'OK' });
        });
    });

});

export = router;