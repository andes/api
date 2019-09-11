import { pacienteApp } from '../schemas/pacienteApp';
import * as express from 'express';
import * as mongoose from 'mongoose';
import { deviceModel } from '../schemas/device';
const router = express.Router();

/**
 * register new device for pacienteApp
 *
 * @param device_id {String}
 * @param device_type {String}
 * @param app_version {String}
 */

router.post('/devices/register', (req: any, res, next) => {
    const token: string = req.headers.authorization.substring(4);
    const user_id = req.user.account_id;
    pacienteApp.findById(user_id, (errFind, user: any) => {
        if (errFind) {
            return res.status(422).send({ message: 'user_invalid' });
        }

        const device_data = {
            device_id: req.body.device_id,
            device_type: req.body.device_type,
            app_version: req.body.app_version,
            session_id: token
        };
        const device = new deviceModel(device_data);
        user.devices.push(device);
        return user.save((errSave, u) => {
            if (errSave) {
                return next(errSave);
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

router.post('/devices/update', (req: any, res, next) => {
    const token: string = req.headers.authorization.substring(4);
    const user_id = req.user.account_id;
    pacienteApp.findById(user_id, (errFind, user: any) => {
        if (errFind) {
            return res.status(422).send({ message: 'user_invalid' });
        }
        const device_data = req.body.device;
        const device = user.devices.id(device_data.id);
        if (device) {
            device.app_version = device_data.app_version;
            device.device_id = device_data.device_id;
            device.device_type = device_data.device_type;
            device.session_id = token;
        }
        return user.save((errSave, u) => {
            if (errSave) {
                return next(errSave);
            }
            res.json(device);
        });
    });
});

/**
 * Remove device from user
 * @param id {ObjectId}
 */

router.post('/devices/delete', (req: any, res, next) => {
    // let token: string = req.headers.authorization.substring(4);
    const user_id = req.user.account_id;

    pacienteApp.findById(user_id, (errFind, user: any) => {
        if (errFind) {
            return res.status(422).send({ message: 'user_invalid' });
        }

        user.devices.pull({ _id: new mongoose.Types.ObjectId(req.body.id) });
        return user.save((errSave, u) => {
            if (errSave) {
                return next(errSave);
            }

            res.json({ message: 'OK' });
        });
    });

});

export = router;
