import * as express from 'express';
import * as campania from '../schemas/campaniasSalud';
import * as campaniaCtrl from '../controller/campaniasSalud';
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

// Todas las campañas vigentes al día de la fecha
router.get('/campanias', async (req, res, next) => {
    let today = new Date(moment().format('YYYY-MM-DD'));
    try {
        let docs: any = await campaniaCtrl.campaniasVigentes(today);
        if (docs.length > 0) {
            res.json(docs);
        } else {
            return null;
        }

    } catch (e) {
        return next(e);
    }
});

export = router;
