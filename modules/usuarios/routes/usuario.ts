import * as express from 'express';
import * as configPrivate from '../../../config.private';
import * as ldapjs from 'ldapjs';

// import { Auth } from './../../../auth/auth.class';
let router = express.Router();
// Services
import { Logger } from '../../../utils/logService';
// Schemas
import * as permisos from '../../../auth/schemas/permisos';
import { Auth } from "../../../auth/auth.class";
// import { log } from '../../log/schemas/log';

const isReachable = require('is-reachable');

router.post('/alta', function (req, res, next) {
    // if (!Auth.check(req, 'usuarios:post')) {
    //     return next(403);
    // }
    let data = new permisos.model(req.body);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        Logger.log(req, 'usuarios', 'insert', {
            accion: 'Crear Usuario',
            ruta: req.url,
            method: req.method,
            data: data,
            err: err || false
        });
        res.json(data);
    });

});

router.put('/:id', function (req, res, next) {
    // if (!Auth.check(req, 'usuarios:put')) {
    //     return next(403);
    // }
    permisos.model.findById(req.params.id).then((resultado: any) => {
        if (resultado) {
            resultado.usuario = req.body.usuario;
            resultado.nombre = req.body.nombre;
            resultado.apellido = req.body.apellido;
            resultado.organizacion = req.body.organizacion;
            resultado.permisos = req.body.permisos;
            resultado.save((err) => {
                if (err) {
                    return next(err);
                }
                Logger.log(req, 'usuarios', 'update', {
                    accion: 'Crear Usuario',
                    ruta: req.url,
                    method: req.method,
                    data: resultado,
                    err: err || false
                });
                res.json(resultado);
            });
        }
    }).catch((err) => {
        return next(err);
    });


});

// Simple mongodb query by ObjectId --> better performance
router.get('/:id', function (req, res, next) {
    // if (!Auth.check(req, 'usuarios:get:byId')) {
    //     return next(403);
    // }
    permisos.model.findById(req.params.id).then((resultado: any) => {
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
    // if (!Auth.check(req, 'usuarios:get:byId:byOrganizacion')) {
    //     return next(403);
    // }
    let filtro = {
        usuario: req.params.usuario,
        organizacion: req.params.organizacion
    };
    permisos.model.find(filtro).then((resultado: any) => {
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
    // if (!Auth.check(req, 'usuarios:get:ldap')) {
    //     return next(403);
    // }
    let server = configPrivate.hosts.ldap + configPrivate.ports.ldapPort;
    isReachable(server).then(reachable => {
        if (!reachable) {
            // console.log('LDAP no reachable');
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
                // console.log('req.body.usuario: ' + req.params.id);
                // Busca el usuario con el UID correcto.
                ldap.search(dn, {
                    scope: 'sub',
                    filter: '(uid=' + req.params.id + ')',
                    paged: false,
                    sizeLimit: 1
                }, function (err2, searchResult) {
                    if (err2) {
                        // console.log('err2: ', err2);
                        return next(err2);
                    }
                    searchResult.on('searchEntry', function (entry) {
                        // console.log('entry: ' + JSON.stringify(entry.object));
                        res.send(entry.object);
                    });
                    searchResult.on('error', function (err3) {
                        // console.log('error: ' + err3.message);
                        return next('Usuario inexistente');
                    });
                });
            });

        }
    });
});

router.get('', function (req, res, next) {
    // if (!Auth.check(req, 'usuarios:get')) {
    //     return next(403);
    // }
    permisos.model.find({}).then((resultado: any) => {
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
