import * as mongoose from 'mongoose';
import * as express from 'express';
import * as configPrivate from '../../config.private';
import * as ldapjs from 'ldapjs';
import { AuthUsers } from '../../auth/schemas/authUsers';
import { Auth } from '../../auth/auth.class';
import { EventCore } from '@andes/event-bus';
import { log } from '@andes/log';
import { logKeys } from '../../config';
import { MongoQuery } from '@andes/core';

const isReachable = require('is-reachable');
export const UsuariosRouter = express.Router();

/**
 * Alta de usuarios
 * @method POST
 */

UsuariosRouter.post('/usuarios', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'usuarios:post')) {
        return next(403);
    }
    try {
        const user = new AuthUsers(req.body);
        Auth.audit(user, req);
        await user.save();
        res.json(user);
        EventCore.emitAsync('usuarios:create', user);
        log(req, logKeys.usuarioCreate.key, null, logKeys.usuarioCreate.operacion, user);

    } catch (err) {
        log(req, logKeys.usuarioCreateError.key, null, logKeys.usuarioCreateError.operacion, req.body);
        return next(err);
    }
});

/**
 * Modificacion de un usuario
 *
 * @method PUT
 */

UsuariosRouter.patch('/usuarios/:id', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'usuarios:put')) {
        return next(403);
    }
    try {
        const user: any = await AuthUsers.findById(req.params.id);
        if (user) {
            user.usuario = req.body.usuario;
            user.nombre = req.body.nombre;
            user.apellido = req.body.apellido;
            // [TODO] verificar permisos de organizacion
            user.organizaciones = req.body.organizaciones;
            Auth.audit(user, req);
            await user.save();

            res.json(user);
            EventCore.emitAsync('usuarios:update', user);
            log(req, logKeys.usuarioUpdate.key, null, logKeys.usuarioUpdate.operacion, user);

        } else {
            return next('not_user');
        }
    } catch (err) {
        return next(err);
    }
});

/**
 * Muestra un usuario
 *
 * @method GET
 * @param {number} dni Numero de documento
 */

UsuariosRouter.get('/usuarios/:documento', Auth.authenticate(), async (req: any, res, next) => {
    if (!Auth.check(req, 'usuarios:get')) {
        return next(403);
    }
    try {
        const { fields } = req.apiOptions();

        const query = AuthUsers.findOne({ usuario: req.params.documento });
        if (fields) {
            query.select(fields);
        }
        const user = await query;
        if (user) {
            return res.json(user);
        }
        throw new Error('not_found');

    } catch (err) {
        return next(err);
    }
});


/**
 * Chequea un documento en LDAP
 *
 * @method GET
 */

UsuariosRouter.get('/usuarios/ldap/:documento', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'usuarios:ldap')) {
        return next(403);
    }
    const documento = req.params.documento;
    const server = configPrivate.hosts.ldap + configPrivate.ports.ldapPort;
    isReachable(server).then(reachable => {
        if (!reachable) {
            return next('Error de Conexión con el servidor de LDAP');
        } else {
            const dn = 'uid=' + documento + ',' + configPrivate.auth.ldapOU;
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
                    filter: '(uid=' + documento + ')',
                    paged: false,
                    sizeLimit: 1
                }, (err2, searchResult) => {
                    if (err2) {
                        return next(err2);
                    }
                    searchResult.on('searchEntry', (entry) => {
                        const user = {
                            nombre: entry.object.givenName,
                            apellido: entry.object.sn,
                            usuario: entry.object.uid,
                            documento: String(entry.object.uid),
                            organizaciones: []
                        };
                        return res.send(user);
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

UsuariosRouter.get('/usuarios', Auth.authenticate(), async (req: any, res, next) => {
    const { skip, limit, fields } = req.apiOptions();
    const query = {};

    if (req.query.apellido) {
        query['apellido'] = MongoQuery.partialString(req.query.apellido);
    }

    if (req.query.nombre) {
        query['nombre'] = MongoQuery.partialString(req.query.nombre);
    }

    if (req.query.documento) {
        query['documento'] = MongoQuery.partialString(req.query.documento);
    }

    if (req.query.usuario) {
        query['usuario'] = parseInt(req.query.usuario, 10);
    }

    if (req.query.search) {
        query['$or'] = [
            { documento: MongoQuery.partialString(req.query.search) },
            { apellido: MongoQuery.partialString(req.query.search) },
            { nombre: MongoQuery.partialString(req.query.search) },
        ];
    }

    if (req.query.organizacion) {
        query['organizaciones._id'] = mongoose.Types.ObjectId(req.query.organizacion);
    }

    try {
        const findQuery = AuthUsers.find(query);
        if (skip) {
            findQuery.limit(skip);
        }
        if (limit) {
            findQuery.limit(limit);
        }

        if (fields) {
            findQuery.select(fields);
        }

        const users = await findQuery;
        return res.json(users);
    } catch (err) {
        return next(err);
    }

});


UsuariosRouter.post('/usuarios/:usuario/organizaciones/:organizacion', Auth.authenticate(), async (req, res, next) => {
    try {
        const user: any = await AuthUsers.findOne({ usuario: req.params.usuario });
        if (user) {
            const organizacion = user.organizaciones.push(req.body);

            Auth.audit(user, req);
            await user.save();
            return res.json(organizacion);
        }
    } catch (err) {
        return next(err);
    }
});

UsuariosRouter.patch('/usuarios/:usuario/organizaciones/:organizacion', Auth.authenticate(), async (req, res, next) => {
    try {
        const user: any = await AuthUsers.findOne({ usuario: req.params.usuario });
        if (user) {
            const organizacion = user.organizaciones.id(req.params.organizacion);
            organizacion.set(req.body);
            user.markModified('organizaciones');
            Auth.audit(user, req);
            await user.save();
            return res.json(organizacion);
        }
    } catch (err) {
        return next(err);
    }
});


UsuariosRouter.delete('/usuarios/:usuario/organizaciones/:organizacion', Auth.authenticate(), async (req, res, next) => {
    try {
        const user: any = await AuthUsers.findOne({ usuario: req.params.usuario });
        if (user) {
            const organizacion = user.organizaciones.id(req.params.organizacion);
            organizacion.remove();

            Auth.audit(user, req);
            await user.save();
            return res.json(organizacion);
        }
    } catch (err) {
        return next(err);
    }
});

