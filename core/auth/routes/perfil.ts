import * as express from 'express';
import * as perfil from '../schemas/perfil';
import { Auth } from '../../../auth/auth.class';
import * as mongoose from 'mongoose';

const router = express.Router();

/*
* Devuelve los datos del perfil con mismo id que el valor pasado por params
*/
router.get('/perfiles/:id', (req: any, res, next) => {
    const id = req.params.id;
    try {
        perfil.findById(id, (err, unPerfil) => {
            if (err) {
                return next(err);
            }
            res.json(unPerfil);
        });
    } catch (err) {
        return next(err);
    }
});


/**
* Devuelve los perfiles globales y, si existen, los locales asociados a la organización donde el usuario está logueado
*/
router.get('/perfiles', Auth.authenticate(), async (req, res, next) => {
    let query = perfil.find({});
    if (req.query.idOrganizacion) { // perfiles globales y locales
        query.or([{ organizacion: { $exists: false } },
        { organizacion: null },
        { organizacion: req.query.idOrganizacion }]);
    } else { // solo perfiles globales
        query.or([
            { organizacion: { $exists: false } },
            { organizacion: null }
        ]);
    }
    if (req.query.activo === true || req.query.activo === false) { // si tiene el parámetro activo, si viene undefined no entra
        query.where('activo').equals(req.query.activo);
    }

    query.exec((err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

/*
* Modifica un perfil con id pasado por params y los valores se obtienen del body
*/
router.put('/perfiles/:id', Auth.authenticate(), async (req, res, next) => {
    try {
        let perfilActualizado = {
            nombre: req.body.nombre,
            permisos: req.body.permisos,
            organizacion: undefined,
            activo: req.body.activo
        };
        if (req.body.organizacion) {
            perfilActualizado.organizacion = req.body.organizacion;
        }

        perfil.update({ _id: req.params.id }, perfilActualizado, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } catch (e) {
        return next(e);
    }
});

/*
* Crea un perfil con los datos pasados por body
*/
router.post('/perfiles', Auth.authenticate(), async (req, res, next) => {
    try {
        let perfilParametro = req.body;
        if (!perfilParametro.organizacion) {
            delete perfilParametro.organizacion;
        }

        let perfilNuevo = new perfil(perfilParametro);
        await perfilNuevo.save();
        res.json(perfilNuevo);
    } catch (e) {
        return next(e);
    }
});

/*
* Borra el perfil que coincida con el id pasado por parámetro
*/
router.delete('/perfiles/:id', (req, res, next) => {
    try {
        perfil.deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) }).then(res2 => {
            res.json(res2);
        });
    } catch (e) {
        return next(e);
    }
});

export = router;
