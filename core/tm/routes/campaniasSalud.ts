import * as express from 'express';
import * as campania from '../schemas/campaniasSalud';
import * as campaniaCtrl from '../controller/campaniasSalud';

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

router.get('/campanias', async (req, res, next) => {
    try {
        let docs: any = await campaniaCtrl.campanias(req.query.fechaDesde, req.query.fechaHasta);
        res.json(docs);
    } catch (e) {
        return next(e);
    }
});

router.put('/campanias/:id', async(req, res, next)=>{
    try{
       let docs: any = await campania.findByIdAndUpdate(req.params.id, req.body, { new : true });
        res.json(docs);
    } catch(e){
        return next(e);
    }
});

router.post('/campanias', async (req, res, next) => {
    try{
        if (req.body.target && !req.body.target.sexo){
            delete req.body.target.sexo;
        }
        const newCampania = new campania(req.body);
        await newCampania.save();
        res.json(newCampania);
    } catch(e){
        return next(e);
    }
});

router.get('/campaniaPublicacion/:id', async (req, res, next) =>{
    const id = req.params.id;
    try {
        await campania.findById(id, (err, unaCampania) => {
            if (err) {
                return next(err);
            }
            res.json(unaCampania);
        });
    } catch (err) {
        return next(err);
    }
});

export = router;
