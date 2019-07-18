import * as express from 'express';
import * as PlantillasRUPCtr from '../controllers/plantillasRUP';

const router = express.Router();

router.get('/plantillas', async (req, res, next) => {
    const data = req.query;
    const plantillas = await PlantillasRUPCtr.find(data, req);
    return res.json(plantillas);
});

router.get('/plantillas/:id', async (req, res, next) => {
    const id = req.params.id;
    const plantilla = await PlantillasRUPCtr.findById(id);
    if (plantilla) {
        return res.json(plantilla);
    } else {
        return next('NOT FOUND');
    }
});

router.post('/plantillas', async (req, res, next) => {
    const body = req.body;
    const plantilla = await PlantillasRUPCtr.create(body, req);
    if (plantilla) {
        return res.json(plantilla);
    } else {
        return next(422);
    }
});

router.patch('/plantillas/:id', async (req, res, next) => {
    const id = req.params.id;
    const body = req.body;
    const plantilla = await PlantillasRUPCtr.update(id, body, req);
    if (plantilla) {
        return res.json(plantilla);
    } else {
        return next(422);
    }
});

router.delete('/plantillas/:id', async (req, res, next) => {
    const id = req.params.id;
    const plantilla = await PlantillasRUPCtr.remove(id);
    if (plantilla) {
        return res.json(plantilla);
    } else {
        return next(422);
    }
});

export = router;
