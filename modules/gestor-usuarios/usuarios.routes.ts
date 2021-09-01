import * as mongoose from 'mongoose';
import { AuthUsers } from '../../auth/schemas/authUsers';
import { Auth } from '../../auth/auth.class';
import { CustomError, MongoQuery, ResourceBase } from '@andes/core';
import { Organizacion } from '../../core/tm/schemas/organizacion';
import { getUserInfo } from '../../auth/ldap.controller';
import { Request, Response } from '@andes/api-tool';
import { updateUserPermisos, createUser, setValidationTokenAndNotify } from '../../auth/auth.controller';

const shiroTrie = require('shiro-trie');
class UsuariosResource extends ResourceBase {
    Model = AuthUsers;
    resourceName = 'usuarios';
    keyId = 'usuario';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('usuarios:read'),
        search: Auth.authorize('usuarios:read'),
        post: Auth.authorize('usuarios:write'),
        patch: Auth.authorize('usuarios:write'),
        delete: Auth.authorize('usuarios:write'),
        ldap: Auth.authorize('usuarios:write')
    };
    searchFileds = {
        apellido: MongoQuery.partialString,
        nombre: MongoQuery.partialString,
        documento: MongoQuery.partialString,
        organizacion: {
            field: 'organizaciones._id',
            fn: (value) => mongoose.Types.ObjectId(value)
        },
        search: ['documento', 'nombre', 'apellido']
    };
    extrasRoutes = [
        {
            path: 'ldap/:documento',
            callback: 'ldap'
        }
    ];

    public async ldap(this: UsuariosResource, req: Request, res: Response) {
        try {
            const documento = req.params.documento;
            const user = await getUserInfo(documento);
            return res.json(user);
        } catch (err) {
            throw new CustomError('No se pudo obtener información del usuario en One Login. Contáctese con un referente informático.', 404);
        }
    }

}

export const UsuariosCtr = new UsuariosResource({});

export const UsuariosRouter = UsuariosCtr.makeRoutes();

UsuariosRouter.post('/usuarios/:usuario/organizaciones/:organizacion', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'usuarios:write')) {
        return next(403);
    }
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

UsuariosRouter.post('/usuarios/create', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'usuarios:write')) {
        return next(403);
    }
    try {
        const user = await createUser(req.body);
        await setValidationTokenAndNotify(req.body.documento);
        return res.json(user);

    } catch (err) {
        return next(err);
    }
});

UsuariosRouter.patch('/usuarios/:usuario/organizaciones/:organizacion', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'usuarios:write')) {
        return next(403);
    }
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
    if (!Auth.check(req, 'usuarios:write')) {
        return next(403);
    }
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

UsuariosRouter.put('/usuarios/:usuario/organizaciones/permisos', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'usuarios:write')) {
        return next(403);
    }
    try {
        return res.json(await updateUserPermisos(req));
    } catch (err) {
        return next(err);
    }
});

UsuariosRouter.get('/organizaciones', Auth.authenticate(), async (req: any, res, next) => {
    function checkPermisos(permisosList, permiso) {
        const shiro = shiroTrie.new();
        shiro.add(permisosList);
        return shiro.check(permiso);
    }

    function getUserOrganization(usuario) {
        return usuario.organizaciones.filter(x => x.activo === true).map((org) => {
            const enable = checkPermisos([...user.permisosGlobales, ...org.permisos], 'usuarios:write');
            return enable ? ObjectId(org._id) : null;
        }).filter(item => item !== null);
    }

    const ObjectId = mongoose.Types.ObjectId;
    const username = (req as any).user.usuario.username;
    const user: any = await AuthUsers.findOne({ usuario: username });

    if (checkPermisos(user.permisosGlobales, 'global:usuarios:write')) {
        const orgs = await Organizacion.find({}, { nombre: 1 }); // YES, GET ALL!
        return res.json(orgs);
    } else {
        const organizaciones = getUserOrganization(user);
        const orgs = await Organizacion.find({ _id: { $in: organizaciones } }, { nombre: 1 });
        return res.json(orgs);
    }

});

UsuariosRouter.post('/usuarios/:usuario/disclaimers/:disclaimer', Auth.authenticate(), async (req, res, next) => {
    try {
        const user: any = await AuthUsers.findOne({ usuario: req.params.usuario });
        if (user) {
            const disclaimer: any = {};
            disclaimer.createdAt = new Date();
            disclaimer._id = req.params.disclaimer;
            user.disclaimers.push(disclaimer);
            Auth.audit(user, req);
            await user.save();
            return res.json(disclaimer);
        }
    } catch (err) {
        return next(err);
    }
});

UsuariosRouter.patch('/usuarios/:usuario/disclaimers/:disclaimer', Auth.authenticate(), async (req, res, next) => {
    try {
        const user: any = await AuthUsers.findOne({ usuario: req.params.usuario });
        if (user) {
            const disclaimer = user.disclaimers.id(req.params.disclaimer);
            disclaimer.set(req.body);
            user.markModified('disclaimers');
            Auth.audit(user, req);
            await user.save();
            return res.json(disclaimer);
        }
    } catch (err) {
        return next(err);
    }
});

UsuariosRouter.delete('/usuarios/:usuario/disclaimers/:disclaimer', Auth.authenticate(), async (req, res, next) => {
    try {
        const user: any = await AuthUsers.findOne({ usuario: req.params.usuario });
        if (user) {
            const disclaimer = user.disclaimers.id(req.params.disclaimer);
            disclaimer.remove();
            Auth.audit(user, req);
            await user.save();
            return res.json(disclaimer);
        }
    } catch (err) {
        return next(err);
    }
});

UsuariosRouter.get('/usuarios/:usuario/disclaimers', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const user: any = await AuthUsers.findOne({ usuario: req.params.usuario });
        if (user) {
            const disclaimers = user.disclaimers;
            return res.json(disclaimers);
        }
    } catch (err) {
        return next(err);
    }
});
