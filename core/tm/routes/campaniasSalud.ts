import * as express from 'express';
import * as campania from '../schemas/campaniasSalud';
import * as moment from 'moment';

let router = express.Router();

router.get('/campania/:id', (req: any, res, next) => {
    const id = req.params.id;
    try {
        campania.findById(id, (err, unaCampania) => {
            if (err) {
                return next(err);
            }
            res.json(unaCampania);
        });
    } catch (err) {
        return next(err);
    }
});

// Todas las campañas vigentes
router.get('/campanias', async (req, res, next) => {
    let today = new Date(moment().format('YYYY-MM-DD'));
    let query = { $and: [{ 'vigencia.desde': { $lte: today } }, { 'vigencia.hasta': { $gte: today } }] };
    campania.find(query, (err, campanias) => {
        if (err) {
            return next(err);
        }
        res.json(campanias);
    }).sort({ 'vigencia.desde': -1 });
});

export = router;
