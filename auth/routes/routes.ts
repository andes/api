import * as express from 'express';
import * as ldapjs from 'ldapjs';
import * as config from '../../config';
import * as configPrivate from '../../config.private';
import { Auth } from './../auth.class';
import * as organizacion from '../schemas/organizacion';
import * as permisos from '../schemas/permisos';
import { profesional } from './../../core/tm/schemas/profesional';

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
            profesional.findOne({ documento: req.body.usuario }, {matriculas: true, especialidad: true}),
        ]).then((data: any[]) => {
            // Verifica que la organización sea válida y que tenga permisos asignados
            if (!data[0] || !data[1] || data[1].length === 0) {
                return next(403);
            }

            // Crea el token con los datos de sesión
            console.log(Auth.generateAppToken('mpiUpdate', organizacion, ['mpi']));
            res.json({
                token: Auth.generateUserToken(nombre, apellido, data[0], data[1], data[2])
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
        let ldap = ldapjs.createClient({ url: `ldap://${configPrivate.hosts.ldap}` });
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
