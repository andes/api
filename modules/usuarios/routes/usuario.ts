import * as express from 'express';
import * as configPrivate from '../../../config.private';
import * as ldapjs from 'ldapjs';

// import { Auth } from './../../../auth/auth.class';
let router = express.Router();
let sha1Hash = require('sha1');
// Services
import { Logger } from '../../../utils/logService';
// Schemas
import { usuario } from '../schemas/usuario';
// import { log } from '../../log/schemas/log';

const isReachable = require('is-reachable');
// Simple mongodb query by ObjectId --> better performance
router.get('/:id', function (req, res, next) {
    // if (!Auth.check(req, 'mpi:get:byId')) {
    //     return next(403);
    // }
    usuario.findById(req.params.id).then((resultado: any) => {
        if (resultado) {
            // Logger.log(req, 'mpi', 'query', {
            //     mongoDB: resultado.paciente
            // });
            res.json(resultado);
        }
    }).catch((err) => {
        return next(err);
    });
});

router.get('/local/:organizacion/:usuario', function (req, res, next) {
    // if (!Auth.check(req, 'mpi:get:byId')) {
    //     return next(403);
    // }
    let filtro = {
        usuario: req.params.usuario,
        organizacion: req.params.organizacion
    };
    usuario.find(filtro).then((resultado: any) => {
        if (resultado) {
            // Logger.log(req, 'mpi', 'query', {
            //     mongoDB: resultado.paciente
            // });
            res.json(resultado);
        }
    }).catch((err) => {
        return next(err);
    });
});

router.get('/ldap/:id', function (req, res, next) {
    let server = configPrivate.hosts.ldap + configPrivate.ports.ldapPort;
    isReachable(server).then(reachable => {
        if (!reachable) {
            console.log('LDAP no reachable');
            return next('Error de Conexión');
        } else {
            let dn = 'uid=' + req.params.id + ',' + configPrivate.auth.ldapOU;
            let ldap = ldapjs.createClient({
                url: `ldap://${configPrivate.hosts.ldap}`
            });
            ldap.bind('', '', function (err) {
                if (err) {
                    return next(ldapjs.InvalidCredentialsError ? 403 : err);
                }
                console.log('req.body.usuario: ' + req.params.id);
                // Busca el usuario con el UID correcto.
                ldap.search(dn, {
                    scope: 'sub',
                    filter: '(uid=' + req.params.id + ')',
                    paged: false,
                    sizeLimit: 1
                }, function (err2, searchResult) {
                    if (err2) {
                        console.log('err2: ', err2);
                        return next(err2);
                    }
                    searchResult.on('searchEntry', function (entry) {
                        console.log('entry: ' + JSON.stringify(entry.object));
                        res.send(entry.object);
                    });
                    searchResult.on('error', function (err3) {
                        console.log('error: ' + err3.message);
                        return next('Usuario inexistente');
                    });
                });
            });

        }
    });
});

router.get('', function (req, res, next) {
    // if (!Auth.check(req, 'mpi:get:byId')) {
    //     return next(403);
    // }
    usuario.find({}).then((resultado: any) => {
        if (resultado) {
            // Logger.log(req, 'mpi', 'query', {
            //     mongoDB: resultado.paciente
            // });
            res.json(resultado);
        }
    }).catch((err) => {
        return next(err);
    });
});

export = router;
