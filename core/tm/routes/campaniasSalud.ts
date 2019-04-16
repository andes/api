import * as express from 'express';
import * as campania from '../schemas/campaniasSalud';
import * as campaniaCtrl from '../controller/campaniasSalud';
import * as moment from 'moment';

let router = express.Router();

/*
* Devuelve los datos de la campaña con misma id que el valor pasado por params
*/
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
/**
 * Devuelve las campañas vigentes en el rango de fechas fechaDesde y fechaHasta, si no se carga
 * las fechas, trae las vigentes al día de la fecha.
 */
router.get('/campanias', async (req, res, next) => {
    try {
        let fechaDesde = req.query.fechaDesde ? req.query.fechaDesde : moment().startOf('day').toDate();

        let docs: any = await campaniaCtrl.campaniasVigentes(fechaDesde, req.query.fechaHasta);
        res.json(docs);
    } catch (e) {
        return next(e);
    }
});

/*
* Modifica una campaña con id pasado por params y los valores se obtienen del body
*/
router.put('/campanias/:id', async (req, res, next) => {
    try {
        let campaniaEncontrada: any = await campania.findById(req.params.id);
        // campos obligatorios
        campaniaEncontrada.asunto = req.body.asunto;
        campaniaEncontrada.cuerpo = req.body.cuerpo;
        campaniaEncontrada.link = req.body.link;
        campaniaEncontrada.imagen = req.body.imagen;
        campaniaEncontrada.vigencia = req.body.vigencia;
        campaniaEncontrada.vigencia.desde = req.body.vigencia.desde;
        campaniaEncontrada.vigencia.hasta = req.body.vigencia.hasta;
        campaniaEncontrada.fechaPublicacion = req.body.fechaPublicacion;
        campaniaEncontrada.activo = req.body.activo;

        // campos no obligatorios, se ponen como undefined para que la base de datos actualice, con DELETE no funcionaba
        if (req.body.target) {
            if (!req.body.target.sexo) {
                campaniaEncontrada.target.sexo = undefined;
            } else {
                campaniaEncontrada.target.sexo = req.body.target.sexo;
            }
            if (req.body.target.grupoEtario) {
                if (!req.body.target.grupoEtario.desde) {
                    campaniaEncontrada.target.grupoEtario.desde = undefined;
                } else {
                    campaniaEncontrada.target.grupoEtario.desde = req.body.target.grupoEtario.desde;
                }
                if (!req.body.target.grupoEtario.hasta) {
                    campaniaEncontrada.target.grupoEtario.hasta = undefined;
                } else {
                    campaniaEncontrada.target.grupoEtario.hasta = req.body.target.grupoEtario.hasta;
                }
            } else {
                campaniaEncontrada.target.grupoEtario = undefined;
            }
        } else {
            campaniaEncontrada.target = undefined;
        }
        if (!req.body.textoAccion) {
            campaniaEncontrada.textoAccion = 'Más información aquí';
        } else {
            campaniaEncontrada.textoAccion = req.body.textoAccion;
        }

        await campaniaEncontrada.save();

        res.json(campaniaEncontrada);

    } catch (e) {
        return next(e);
    }
});

/*
* Crea una campaña con los valores pasado por req.body
*/
router.post('/campanias', async (req, res, next) => {
    try {
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

        let campaniaNueva = new campania(campaniaParametro);
        await campaniaNueva.save();
        res.json(campaniaNueva);
    } catch (e) {
        return next(e);
    }
});

/*
* Devuelve la campaña con el id pasado por params
*/
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
