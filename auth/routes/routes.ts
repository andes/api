import * as express from 'express';
import * as ldapjs from 'ldapjs';
import * as configPrivate from '../../config.private';
import { Auth } from './../auth.class';
import * as organizacion from '../schemas/organizacion';
import * as permisos from '../schemas/permisos';
import { profesional } from './../../core/tm/schemas/profesional';
import * as mongoose from 'mongoose';
import * as authMobile from '../../modules/mobileApp/controller/AuthController';

const isReachable = require('is-reachable');
let sha1Hash = require('sha1');


let router = express.Router();

router.get('/sesion', Auth.authenticate(), function (req, res) {
    res.json((req as any).user);
});

router.get('/organizaciones', function (req, res, next) {
    if (req.query.usuario) {
        permisos.model.find({
            usuario: req.query.usuario
        }, { organizacion: 1, _id: 0 }).then((data) => {
            let ids = data.map((item: any) => mongoose.Types.ObjectId(item.organizacion));
            organizacion.model.find({ _id: { $in: ids } }, { nombre: true },
                function (err, data2) {
                    if (err) {
                        return next(err);
                    } else {
                        res.json(data2);
                    }
                });
        });
    } else {
        organizacion.model.find({}, {
            nombre: true
        }, function (err, data) {
            if (err) {
                return next(err);
            } else {
                res.json(data);
            }
        });
    }
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

        });
    });
};

router.post('/login', function (req, res, next) {
    // Función interna que genera token
    let login = function (nombre: string, apellido: string) {
        Promise.all([
            organizacion.model.findById(req.body.organizacion, {
                nombre: true
            }),
            permisos.model.findOne({
                usuario: req.body.usuario,
                organizacion: req.body.organizacion
            }),
            profesional.findOne({
                documento: req.body.usuario
            }, {
                    matriculas: true,
                    especialidad: true
                }),
            permisos.model.findOneAndUpdate(
                { usuario: req.body.usuario },
                { password: sha1Hash(req.body.password), nombre: nombre, apellido: apellido },
            )
        ]).then((data: any[]) => {
            // Verifica que la organización sea válida y que tenga permisos asignados
            if (!data[0] || !data[1] || data[1].length === 0) {
                return next(403);
            }

            if (req.body.mobile) {
                checkMobile(data[2]._id).then((account: any) => {
                    // Crea el token con los datos de sesión
                    res.json({
                        token: Auth.generateUserToken(nombre, apellido, data[0], data[1], data[2], account._id),
                        user: account
                    });

                });
            } else {
                // Crea el token con los datos de sesión
                res.json({
                    token: Auth.generateUserToken(nombre, apellido, data[0], data[1], data[2])
                });

            }
        });
    };

    let loginCache = function (password: string) {
        Promise.all([
            organizacion.model.findById(req.body.organizacion, {
                nombre: true
            }),
            permisos.model.findOne({
                usuario: req.body.usuario,
                password: password,
                organizacion: req.body.organizacion
            }),
            profesional.findOne({
                documento: req.body.usuario
            }, {
                    matriculas: true,
                    especialidad: true
                }),
        ]).then((data: any[]) => {
            // Verifica que la organización sea válida y que tenga permisos asignados
            if (!data[0] || !data[1] || data[1].length === 0) {
                return next(403);
            }

            let nombre = data[1].nombre;
            let apellido = data[1].apellido;
            let profesional2 = data[2];

            // Crea el token con los datos de sesión
            if (req.body.mobile) {
                checkMobile(profesional2._id).then((account: any) => {
                    // Crea el token con los datos de sesión
                    res.json({
                        token: Auth.generateUserToken(nombre, apellido, data[0], data[1], profesional2, account._id),
                        user: account
                    });

                });
            } else {
                // Crea el token con los datos de sesión
                res.json({
                    token: Auth.generateUserToken(nombre, apellido, data[0], data[1], profesional2)
                });
            }
        });
    };

    // Valida datos
    if (!req.body.usuario || !req.body.password || !req.body.organizacion) {
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

export = router;
