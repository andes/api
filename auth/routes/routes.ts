import * as express from 'express';
import * as ldapjs from 'ldapjs';
import * as configPrivate from '../../config.private';
import { Auth } from './../auth.class';
import { authUsers } from '../schemas/permisos';
import * as authOrganizaciones from './../../core/tm/schemas/organizacion';
import { profesional } from './../../core/tm/schemas/profesional';
import * as mongoose from 'mongoose';
import * as authMobile from '../../modules/mobileApp/controller/AuthController';

const isReachable = require('is-reachable');
let sha1Hash = require('sha1');
let shiroTrie = require('shiro-trie');
let router = express.Router();

/**
 * Obtiene el user de la session
 * @get /api/auth/sesion
 */

router.get('/sesion', Auth.authenticate(), function (req, res) {
    res.json((req as any).user);
});

/**
 * Listado de organizaciones a las que el usuario tiene permiso
 * @get /api/auth/organizaciones
 */
router.get('/organizaciones', Auth.authenticate(), (req, res, next) => {
    let username = (req as any).user.usuario.username;
    authUsers.findOne({ usuario: username }, (err, user: any) => {
        if (err) {
            return next(err);
        }
        let organizaciones = user.organizaciones.map((item) => {
            if ((req as any).query.admin) {
                let shiro = shiroTrie.new();
                shiro.add(item.permisos);
                if (shiro.check('usuarios:set')) {
                    return mongoose.Types.ObjectId(item._id);
                } else {
                    return null;
                }
            } else {
                return mongoose.Types.ObjectId(item._id);
            }
        }).filter(item => item !== null);
        authOrganizaciones.model.find({ _id: { $in: organizaciones } }, (errOrgs, orgs: any[]) => {
            if (errOrgs) {
                return next(errOrgs);
            }
            res.json(orgs);
        });
    });
});

/**
 * Refresca el token y los permisos dado una organizacion}
 * @param {ObjectId} organizacion ID de la organizacion
 * @post /api/auth/organizaciones
 */

router.post('/organizaciones', Auth.authenticate(), (req, res, next) => {
    let username = (req as any).user.usuario.username;
    let orgId = mongoose.Types.ObjectId(req.body.organizacion);
    Promise.all([
        authUsers.findOne({
            'usuario': username,
            'organizaciones._id': orgId
        }),
        authOrganizaciones.model.findOne({ _id: orgId }, { nombre: 1 })
    ]).then((data: any[]) => {
        if (data[0] && data[1]) {
            let user = data[0];
            let org = data[1];
            let oldToken: string = String(req.headers.authorization).substring(4);
            let nuevosPermisos = user.organizaciones.find(item => String(item._id) === String(org._id));
            let refreshToken = Auth.refreshToken(oldToken, user, nuevosPermisos.permisos, org);
            res.send({
                token: refreshToken
            });
        } else {
            next('Organización inválida');
        }
    });
});

// Función interna que chequea si la cuenta mobile existe
let checkMobile = function (profesionalId) {
    return new Promise((resolve, reject) => {
        authMobile.getAccountByProfesional(profesionalId).then((account) => {
            if (!account) {
                profesional.findById(profesionalId).then(prof => {
                    if (!prof) {
                        return reject();
                    }
                    authMobile.createUserFromProfesional(prof).then((account2) => {
                        resolve(account2);
                    }).catch(reject);
                });
                return;
            }
            resolve(account);
        }).catch(() => {
            reject();
        });
    });
};

/**
 * Refresca el token y los permisos dado una organizacion}
 * @param {string} username nombre de usuario (DNI)
 * @param {string} password Password de la cuenta
 * @post /api/auth/login
 */

router.post('/login', function (req, res, next) {
    // Función interna que genera token
    let login = function (nombre: string, apellido: string) {
        Promise.all([
            // organizacion.model.findById(req.body.organizacion, {
            //     nombre: true
            // }),
            authUsers.findOne({
                usuario: req.body.usuario
                // organizacion: req.body.organizacion
            }),
            profesional.findOne({
                documento: req.body.usuario
            }, {
                    matriculas: true,
                    especialidad: true
                }),
            authUsers.findOneAndUpdate(
                { usuario: req.body.usuario },
                { password: sha1Hash(req.body.password), nombre: nombre, apellido: apellido },
            )
        ]).then((data: any[]) => {
            // Verifica que el usuario sea valido y que tenga permisos asignados
            if (!data[0] || data[0].length === 0) {
                return next(403);
            }
            if (req.body.mobile) {
                checkMobile(data[1]._id).then((account: any) => {
                    // Crea el token con los datos de sesión
                    res.json({
                        token: Auth.generateUserToken(data[0], null, [], data[1], account._id),
                        user: account
                    });

                });
            } else {
                // Crea el token con los datos de sesión

                res.json({
                    token: Auth.generateUserToken(data[0], null, [], data[1])
                });

            }
        });
    };

    let loginCache = function (password: string) {
        Promise.all([
            authUsers.findOne({
                usuario: req.body.usuario,
                password: password
            }),
            profesional.findOne({
                documento: req.body.usuario
            }, {
                    matriculas: true,
                    especialidad: true
                }),
        ]).then((data: any[]) => {
            // Verifica que el usuario sea valido y que tenga permisos asignados
            if (!data[0] || data[0].length === 0) {
                return next(403);
            }
            let nombre = data[0].nombre;
            let apellido = data[0].apellido;
            let profesional2 = data[1];
            // Crea el token con los datos de sesión
            if (req.body.mobile) {
                checkMobile(profesional2._id).then((account: any) => {
                    // Crea el token con los datos de sesión
                    res.json({
                        token: Auth.generateUserToken(data[0], null, [], profesional2, account._id),
                        user: account
                    });
                });
            } else {
                // Crea el token con los datos de sesión
                res.json({
                    token: Auth.generateUserToken(data[0], null, [], profesional2)
                });
            }
        });
    };
    // Valida datos
    if (!req.body.usuario || !req.body.password) {
        return next(403);
    }
    // Usar LDAP?
    if (!configPrivate.auth.useLdap) {
        // Access de prueba
        login(req.body.usuario, req.body.usuario);
    } else {
        let server = configPrivate.hosts.ldap + configPrivate.ports.ldapPort;
        /* Verifico que el servicio de ldap esté activo */
        isReachable(server).then(reachable => {
            if (!reachable) {
                /* Login by cache */
                let passwordSha1 = sha1Hash(req.body.password);
                loginCache(passwordSha1);

            } else {
                // Conecta a LDAP
                let dn = 'uid=' + req.body.usuario + ',' + configPrivate.auth.ldapOU;
                let ldap = ldapjs.createClient({
                    url: `ldap://${configPrivate.hosts.ldap}`
                });
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
    }
});

/**
 * Genera FileToken para poder acceder a archivos embebidos
 */

router.post('/file-token', Auth.authenticate(), (req, res, next) => {
    return res.json({token: Auth.generateFileToken()});
});

export = router;
