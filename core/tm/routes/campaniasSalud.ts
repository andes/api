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
        console.log('campanias filtradas: ', docs);
        res.json(docs);
    } catch (e) {
        return next(e);
    }
});

router.put('/campanias/:id', async (req, res, next) => {
    try {
        // console.log('campania a modificar: ', req.body);
        let docs: any = await campania.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(docs);
        // let campaniaEncontrada: any = await campania.findById(req.params.id);
        // console.log('encontrada', campaniaEncontrada);

        // if (req.body.target) {
        //     if (!req.body.target.sexo) {
        //         delete req.body.target.sexo;
        //     }
        //     if (req.body.target.grupoEtario) {
        //         if (!req.body.target.grupoEtario.desde) {
        //             delete req.body.target.grupoEtario.desde;
        //         }
        //         if (!req.body.target.grupoEtario.hasta) {
        //             delete req.body.target.grupoEtario.hasta;
        //         }
        //     }
        // }
        // if (!req.body.textoAccion) {
        //     delete req.body.textoAccion;
        // }
        // campaniaEncontrada.set(req.body);
        // campaniaEncontrada.markModified('target.sexo');

        // console.log('a guardar', campaniaEncontrada);
        // console.log('req.body', req.body);
        // await campaniaEncontrada.save();

        // res.json(campaniaEncontrada);

    } catch (e) {
        return next(e);
    }
});

router.post('/campanias', async (req, res, next) => {
    try {
        // if (req.body.target && !req.body.target.sexo) {
        //     delete req.body.target.sexo;
        // }
        let campaniaParametro = req.body;
        if (campaniaParametro.target) {
            if (!campaniaParametro.target.sexo) {
                delete campaniaParametro.target.sexo;
            }
            if (campaniaParametro.target.grupoEtario) {
                if (!campaniaParametro.target.grupoEtario.desde) {
                    delete campaniaParametro.target.grupoEtario.desde;
                }
                if (!campaniaParametro.target.grupoEtario.hasta) {
                    delete campaniaParametro.target.grupoEtario.hasta;
                }
            }
        }
        if (!campaniaParametro.textoAccion) {
            delete campaniaParametro.textoAccion;
        }

        const newCampania = new campania(req.body);
        await newCampania.save();
        res.json(newCampania);
    } catch (e) {
        return next(e);
    }
});

router.get('/campaniaPublicacion/:id', async (req, res, next) => {
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
