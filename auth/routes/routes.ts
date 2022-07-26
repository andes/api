import { Modulos } from '../../core/tm/schemas/modulos.schema';
import * as express from 'express';
import * as mongoose from 'mongoose';
import { updateAccount } from '../../modules/mobileApp/controller/AuthController';
import { checkMobile, findUser, generateTokenPayload, reset, setValidationTokenAndNotify, updateUser } from '../auth.controller';
import { checkPassword } from '../ldap.controller';
import { AuthUsers } from '../schemas/authUsers';
import { Organizacion } from './../../core/tm/schemas/organizacion';
import { Auth } from './../auth.class';


const sha1Hash = require('sha1');
const shiroTrie = require('shiro-trie');
const router = express.Router();


/**
 * Obtiene el user de la session
 * @get /api/auth/sesion
 */

router.get('/sesion', Auth.authenticate(), (req, res) => {
    res.json((req as any).user);
});

/**
 * Listado de organizaciones a las que el usuario tiene permiso desde un modulo en particular.
 * Momentaneamente solo se resuelve para Bi-Queries.
 * @get /api/auth/bi-queries/organizaciones
 */

router.get('/submodulo/:idModule/organizaciones', Auth.authenticate(), async (req: any, res, next) => {
    let pipelineModulo = [];
    pipelineModulo = [
        {
            $match: { 'submodulos._id': mongoose.Types.ObjectId(req.params.idModule) }
        },
        {
            $unwind: '$submodulos'
        },
        {
            $match: { 'submodulos._id': mongoose.Types.ObjectId(req.params.idModule) }
        },
        {
            $project: {
                _id: 0,
                nombre: '$submodulos.nombre'
            }
        }
    ];
    const nombreModulo: any = await Modulos.aggregate(pipelineModulo);
    if (nombreModulo.length && nombreModulo[0].nombre === 'BI-Queries') {
        const user: any = await AuthUsers.findOne({ _id: req.user.usuario.id });
        const organizaciones = user.organizaciones.filter(x => x.activo === true).map(item => mongoose.Types.ObjectId(item._id));
        const permisosBiQueries = user.organizaciones.filter(org => org._id.toString() === req.user.organizacion._id)
            .map(item => item.permisos.findIndex(permisos => permisos === 'visualizacionInformacion:biQueries:*' || permisos === 'visualizacionInformacion:*'));
        if (permisosBiQueries[0] !== -1) {
            let filtro: any = { _id: { $in: organizaciones } };
            const permisosOrganizacion = user.organizaciones.filter(org => org._id.toString() === req.user.organizacion._id)
                .map(item => item.permisos.findIndex(permisos => permisos === 'visualizacionInformacion:totalOrganizaciones' || permisos === 'visualizacionInformacion:*'));
            if (permisosOrganizacion[0] !== -1) {
                filtro = { activo: true };
            }
            const orgs = await Organizacion.find(filtro, { nombre: 1 }).sort({ nombre: 1 });
            return res.json(orgs);
        };
    } else {
        return next('Módulo inválido');
    }
});

/**
 * Listado de organizaciones a las que el usuario tiene permiso
 * @get /api/auth/organizaciones
 */

router.get('/organizaciones', Auth.authenticate(), async (req: any, res, next) => {
    const username = (req as any).user.usuario.username || (req as any).user.usuario;
    const user: any = await AuthUsers.findOne({ usuario: username });
    const organizaciones = user.organizaciones.filter(x => x.activo === true).map((item) => {
        return mongoose.Types.ObjectId(item._id);
    });
    const orgs = await Organizacion.find({ _id: { $in: organizaciones } }, { nombre: 1 }).sort({ nombre: 1 });
    return res.json(orgs);
});

/**
 * Refresca el token y los permisos dado una organizacion}
 * @param {ObjectId} organizacion ID de la organizacion
 * @post /api/auth/organizaciones
 */

router.post('/v2/organizaciones', Auth.authenticate(), async (req, res, next) => {
    const username = req.user.usuario.username || req.user.usuario;
    const orgId = mongoose.Types.ObjectId(req.body.organizacion);
    const account_id = (req as any).user.account_id;

    const dto = await generateTokenPayload(username, orgId, account_id);
    if (dto) {
        return res.send({
            token: dto.token
        });
    } else {
        return next('Organización inválida');
    }
});

router.post('/organizaciones', Auth.authenticate(), async (req, res, next) => {
    const username = req.user.usuario.username || req.user.usuario;
    const orgId = mongoose.Types.ObjectId(req.body.organizacion);
    const [user, org]: [any, any] = await Promise.all([
        AuthUsers.findOne({
            usuario: username,
            'organizaciones._id': orgId
        }),
        Organizacion.findOne({ _id: orgId }, { nombre: 1 })
    ]);
    if (user && org) {
        const oldToken: string = String(req.headers.authorization).substring(4);
        const nuevosPermisos = user.organizaciones.find(item => String(item._id) === String(org._id));
        const refreshToken = Auth.refreshToken(oldToken, user, [...user.permisosGlobales, ...nuevosPermisos.permisos], org);
        return res.send({
            token: refreshToken
        });
    } else {
        return next('Organización inválida');
    }
});

/**
 * Refresca el token y los permisos dado una organizacion}
 * @param {string} username nombre de usuario (DNI)
 * @param {string} password Password de la cuenta
 * @post /api/auth/login
 */

router.post('/login', async (req, res, next) => {
    // Función interna que genera token
    const login = async (user, prof) => {
        await updateUser(user.usuario, user.nombre, user.apellido, user.password);
        if (req.body.mobile) {
            if (prof && prof._id) {
                try {
                    const account: any = await checkMobile(prof._id);
                    await updateAccount(account, { lastLogin: new Date() });
                    return res.json({
                        token: Auth.generateUserToken(user, null, [], prof, account._id),
                        user: account
                    });
                } catch (e) {
                    return next(403);
                }
            } else {
                return next(403);
            }
        } else {
            res.json({
                token: Auth.generateUserToken2(user.usuario)
            });
        }
    };

    if (!req.body.usuario || !req.body.password) {
        return next(403);
    }

    try {
        const userResponse = await findUser(req.body.usuario);
        if (userResponse) {
            const { user, profesional }: any = userResponse;
            switch (user.authMethod || 'ldap') {
                case 'ldap':
                    const ldapUser = await checkPassword(user, req.body.password);
                    if (ldapUser) {
                        user.nombre = ldapUser.nombre;
                        user.apellido = ldapUser.apellido;
                        user.password = sha1Hash(req.body.password);
                        return login(user, profesional);
                    } else {
                        return next(403);
                    }
                case 'password':
                    const passwordSha1 = sha1Hash(req.body.password);
                    if (passwordSha1 === user.password) {
                        return login(user, profesional);
                    }
                    break;
            }
        }
        return next(403);
    } catch (error) {
        return next(403);
    }
});

/**
 * Refresca el token de un usuario
 * @param {string} token token de la cuenta
 * @post /api/auth/refreshToken
 * SE USA EN APP MOBILE
 */
router.post('/refreshToken', Auth.authenticate(), async (req, res, next) => {
    try {
        const oldToken: string = req.body.token;
        const usuario = (req as any).user.usuario;
        usuario['usuario'] = usuario.username;
        usuario['_id'] = usuario.id;
        const organizacion = req.body.organizacion ? req.body.organizacion : null;
        const refreshToken = Auth.refreshToken(oldToken, usuario, [], organizacion);
        if (refreshToken) {
            return res.json({
                token: refreshToken
            });
        } else {
            return next(403);
        }

    } catch (error) {
        return next(403);
    }
});
/**
 * Genera FileToken para poder acceder a archivos embebidos
 */

router.post('/file-token', Auth.authenticate(), (req, res, next) => {
    return res.json({ token: Auth.generateFileToken() });
});


router.post('/setValidationTokenAndNotify', async (req, res, next) => {
    try {
        const username = req.body.username;
        if (username) {
            const result = await setValidationTokenAndNotify(username);
            if (result) {
                return res.json({ status: 'ok' });
            } else {
                return res.json({ status: 'redirectOneLogin' });
            }
        } else {
            return next(403);
        }
    } catch (error) {
        return next(error);
    }
});

router.post('/resetPassword', async (req, res, next) => {
    try {
        const { token, password } = req.body;
        if (token && password) {
            const result = await reset(token, password);
            if (result) {
                return res.json({ status: 'ok' });
            } else {
                return next(404);
            }
        } else {
            return next(403);
        }
    } catch (error) {
        return next(error);
    }
});

export = router;
