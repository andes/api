import * as express from 'express';
import { Types } from 'mongoose';
import { DeviceModel } from '../schemas/device';
import { Auth } from './../../../auth/auth.class';
import { PacienteApp } from '../schemas/pacienteApp';

const router = express.Router();
router.use(Auth.authenticate());


router.use((req: any, res, next) => {
    req.token = req.headers.authorization.substring(4);
    const user_id = req.user.account_id;

    PacienteApp.findById(user_id, (errFind, user: any) => {
        if (errFind) {
            return res.status(422).send({ message: 'user_invalid' });
        }

        req.account = user;
        return next();
    });

});

/**
 * register new device for pacienteApp
 *
 * @param device_id {String}
 * @param device_type {String}
 * @param app_version {String}
 */

router.post('/devices/register', (req: any, res, next) => {
    if (!req.body.device_id || !req.body.device_type || !req.body.app_version) {
        return next({ message: 'invalid_format' });
    }
    let device_data = {
        device_id: req.body.device_id,
        device_type: req.body.device_type,
        app_version: req.body.app_version,
        session_id: req.token
    };
    let device = req.account.devices.find((item) => item.device_id === req.body.device_id);
    if (!device) {
        device = new DeviceModel(device_data);
        req.account.devices.push(device);
        return req.account.save((errSave, u) => {
            if (errSave) {
                return next(errSave);
            }
            return res.json(device);
        });
    } else {
        return res.json(device);
    }
});

/**
 * Update device specification of PacienteApp
 * @param device {Object} {
 *      @param id {ObjectId}
 *      @param device_id {String}
 *      @param device_type {String}
 *      @param app_version {String}
 * }
 */

router.post('/devices/update', (req: any, res, next) => {
    let device_data = req.body.device;
    let device = req.account.devices.id(device_data.id);
    if (device) {
        device.app_version = device_data.app_version;
        device.device_id = device_data.device_id;
        device.device_type = device_data.device_type;
        device.session_id = req.token;
        return req.account.save((errSave) => {
            if (errSave) {
                return next(errSave);
            }
            return res.json(device);
        });
    } else {
        return next({ message: 'no_device' });
    }

});

/**
 * Remove device from user
 * @param id {ObjectId}
 */

router.post('/devices/delete', (req: any, res, next) => {
    req.account.devices.pull({ _id: Types.ObjectId(req.body.id) });
    return req.account.save((errSave, u) => {
        if (errSave) {
            return next(errSave);
        }

        res.json({ message: 'OK' });
    });
});

export = router;
