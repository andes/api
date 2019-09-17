import * as express from 'express';
import { MailContactoGestion } from '../schemas/mail';

const router = express.Router();

router.get('/mailContactos', async (req: any, res, next) => {
    try {
        let data = await MailContactoGestion.find({});
        res.json(data);
    } catch (error) {
        return next(error);
    }
});

router.post('/mailContactos', async (req: any, res, next) => {
    try {
        const newContacto = new MailContactoGestion(req.body);
        let respuesta = await newContacto.save();
        res.json(respuesta);
    } catch (error) {
        return next(error);
    }
});

export = router;
