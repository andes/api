import * as express from 'express';
import * as mongoose from 'mongoose';
import * as jwt from 'jsonwebtoken';
import * as config from '../../config';
import { Auth } from './../auth.class';
import * as organizacion from '../schemas/organizacion';
import * as permisos from '../schemas/permisos';

let router = express.Router();

router.get('/sesion', Auth.authenticate(), function (req, res) {
    res.json((req as any).user);
});

router.get('/organizaciones', function (req, res, next) {
    organizacion.model.find({}, { nombre: true }, function (err, data) {
        if (err) {
            return next(err);
        } else {
            res.json(data);
        }
    });
});

router.post('/login', function (req, res, next) {
    if (!req.body.usuario || !req.body.password || !req.body.organizacion) {
        return next(403);
    }

    Promise.all([
        organizacion.model.findById(req.body.organizacion, { nombre: true }),
        permisos.model.findOne({ usuario: req.body.usuario, organizacion: req.body.organizacion }),
    ]).then((data: any[]) => {
        // Verifica que la organización sea válida
        if (!data[0] || !data[1] || data[1].length === 0) {
            return next(403);
        }

        // Crea el token con los datos de sesión
        let token = {
            id: mongoose.Types.ObjectId(),
            usuario: {
                nombreCompleto: 'Haruki Morakami',
                nombre: 'Haruki',
                apellido: 'Morakami',
                username: data[1].usuario,
                documento: data[1].usuario
            },
            roles: [data[1].roles],
            organizacion: data[0],
            permisos: data[1].permisos
        };
        res.json({
            token: jwt.sign(token, config.jwtPrivateKey, { expiresIn: 3000000 })
        });
    });

    // TODO: Llamar a servidor LDAP
    // user.get(req.body.username, req.body.password, function (err, data) {
    //     if (err) {
    //         return next(err);
    //     }

    //     let token = jwt.sign({
    //         sub: data.id,
    //         id: data.id,
    //         name: data.name,
    //         avatar: (data.avatar) ? data.avatar : '',
    //         given_name: data.given_name,
    //         family_name: data.family_name,
    //         scope: {
    //             variables: data.variables,
    //         }
    //     }, config.jwtPrivateKey, {
    //             expiresIn: 3000000
    //         });
    //     res.json({
    //         token: token
    //     });
    // });
});

export = router;
