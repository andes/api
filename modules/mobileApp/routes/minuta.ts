import * as express from 'express';
import { Minuta } from '../schemas/minuta';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.post('/minuta', async (req, res, next) => {
    try {
        const newMinuta = new Minuta(req.body);
        Auth.audit(newMinuta, req);
        let respuesta = await newMinuta.save();
        res.json(respuesta);
    } catch (error) {
        return next(error);
    }
});

router.get('/minuta', async (req: any, res, next) => {
    try {
        let data = await Minuta.find({});
        res.json(data);
    } catch (error) {
        return next(error);
    }
});

router.patch('/minuta/:id', async (req, res, next) => {
    try {
        let minuta: any = await Minuta.findById(req.params.id);
        console.log('body ', req.body);
        minuta.temas = req.body.temas;
        Auth.audit(minuta, req);
        await minuta.save();
        res.json(minuta);
    } catch (error) {
        return next(error);
    }
});

router.put('/minuta/:id', (req, res, next) => {
    Minuta.findByIdAndUpdate(req.params._id, req.body, { new: true }, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
