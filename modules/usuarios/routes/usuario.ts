import * as mongoose from 'mongoose';
import * as express from 'express';
import * as configPrivate from '../../../config.private';
import * as ldapjs from 'ldapjs';
// Routes
const router = express.Router();
// Services
import { Logger } from '../../../utils/logService';
// Schemas
import { authUsers } from '../../../auth/schemas/permisos';
// imports
import { Auth } from '../../../auth/auth.class';
import { EventCore } from '@andes/event-bus';
// Constantes
const isReachable = require('is-reachable');

/**
 * Alta de usuarios
 * @method POST
 */

router.post('/alta', (req, res, next) => {
    if (!Auth.check(req, 'usuarios:post')) {
        return next(403);
    }
    const data = new authUsers(req.body);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        Logger.log(req, 'usuarios', 'insert', {
            accion: 'Crear Usuario',
            ruta: req.url,
            method: req.method,
            data,
            err: err || false
        });
        res.json(data);

        EventCore.emitAsync('usuarios:create', data);

    });
});

/**
 * Modificacion de un usuario
 *
 * @method PUT
 */

router.put('/:id', (req, res, next) => {
    if (!Auth.check(req, 'usuarios:put')) {
        return next(403);
    }
    authUsers.findById(req.params.id).then((resultado: any) => {
        if (resultado) {
            resultado.usuario = req.body.usuario;
            resultado.nombre = req.body.nombre;
            resultado.apellido = req.body.apellido;
            // [TODO] verificar permisos de organizacion
            resultado.organizaciones = req.body.organizaciones;
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
                EventCore.emitAsync('usuarios:update', resultado);
            });
        } else {
            return next('not_user');
        }
    }).catch((err) => {
        return next(err);
    });
});

/**
 * Muestra un usuario
 *
 * @method GET
 * @param {number} dni Numero de documento
 */

router.get('/:dni', (req, res, next) => {
    if (!Auth.check(req, 'usuarios:get')) {
        return next(403);
    }
    authUsers.findOne({ usuario: req.params.dni }).then((resultado: any) => {
        if (resultado) {
            return res.json([resultado]);
        }
        return res.json([]);
    }).catch((err) => {
        return next(err);
    });
});

/**
 * Chequea un documento en LDAP
 *
 * @method GET
 */

router.get('/ldap/:id', (req, res, next) => {
    if (!Auth.check(req, 'usuarios:ldap')) {
        return next(403);
    }
    const server = configPrivate.hosts.ldap + configPrivate.ports.ldapPort;
    isReachable(server).then(reachable => {
        if (!reachable) {
            return next('Error de Conexión con el servidor de LDAP');
        } else {
            const dn = 'uid=' + req.params.id + ',' + configPrivate.auth.ldapOU;
            const ldap = ldapjs.createClient({
                url: `ldap://${configPrivate.hosts.ldap}`
            });
            ldap.bind('', '', (err) => {
                if (err) {
                    return next(ldapjs.InvalidCredentialsError ? 403 : err);
                }
                // Busca el usuario con el UID correcto.
                ldap.search(dn, {
                    scope: 'sub',
                    filter: '(uid=' + req.params.id + ')',
                    paged: false,
                    sizeLimit: 1
                }, (err2, searchResult) => {
                    if (err2) {
                        return next(err2);
                    }
                    searchResult.on('searchEntry', (entry) => {
                        res.send(entry.object);
                    });
                    searchResult.on('error', (err3) => {
                        return next('Usuario inexistente');
                    });
                });
            });
        }
    });
});

/**
 * Listado de usuarios
 * @method GET
 *
 */

router.get('', (req, res, next) => {
    const organizaciones = Auth.getPermissions(req, 'usuarios:get:organizacion:?');
    if (!organizaciones.length) {
        return next(403);
    }
    let query;
    if (organizaciones.indexOf('*') >= 0) {
        query = {
        };
    } else {
        query = {
            'organizaciones._id': {
                $in: organizaciones.map(item => mongoose.Types.ObjectId(item))
            }
        };
    }

    authUsers.find(query).then((resultado: any) => {
        if (resultado) {
            res.json(resultado);
        } else {
            res.send([]);
        }
    }).catch((err) => {
        return next(err);
    });
});
export = router;
