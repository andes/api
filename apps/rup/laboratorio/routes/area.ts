import { AreaLaboratorio } from './../schemas/areaLaboratorio';
import * as express from 'express';

let router = express.Router();

router.get('/areas/', async (req, res, next) => {
    try {
        AreaLaboratorio.find().then((areas: any) => {
            res.json(areas);
        });
    } catch (e) {
        res.json(e);

    }
});

export = router;
