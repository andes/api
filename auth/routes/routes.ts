import * as express from 'express';
import * as mongoose from 'mongoose';
import * as jwt from 'jsonwebtoken';
import * as ldapjs from 'ldapjs';
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
    // Función interna que genera token
    let login = function (nombre: string, apellido: string) {
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
                    nombreCompleto: nombre + ' ' + apellido,
                    nombre: nombre,
                    apellido: apellido,
                    username: data[1].usuario,
                    documento: data[1].usuario
                },
                roles: [data[1].roles],
                organizacion: data[0],
                permisos: data[1].permisos
            };
            res.json({
                token: jwt.sign(token, config.auth.privateKey, { expiresIn: 3000000 })
            });
        });
    };

    // Valida datos
    if (!req.body.usuario || !req.body.password || !req.body.organizacion) {
        return next(403);
    }

    // Usar LDAP?
    if (!config.auth.useLdap) {
        // Access de prueba
        login(req.body.usuario, req.body.usuario);
    } else {
        // Conecta a LDAP
        let dn = 'uid=' + req.body.usuario + ',' + config.auth.ldapOU;
        let ldap = ldapjs.createClient({ url: config.auth.ldapServer });
        ldap.bind(dn, req.body.password, function (err) {
            if (err) {
                return next(ldapjs.InvalidCredentialsError ? 403 : err);
            }

            // Busca el usuario con el UID correcto.
            ldap.search(dn, {
                scope: 'sub',
                filter: '(uid=' + req.body.usuario + ')',
                paged: false,
                sizeLimit: 1
            }, function (err2, searchResult) {
                if (err2) {
                    return next(err2);
                }
                searchResult.on('searchEntry', function (entry) {
                    login(entry.object.givenName, entry.object.sn);
                });
                searchResult.on('error', function (err3) {
                    return next(err3);
                });
            });
        });
    }
});

export = router;
