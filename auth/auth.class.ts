import { Request, Response } from '@andes/api-tool';
import { ObjectId } from '@andes/core';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import * as mongoose from 'mongoose';
import * as passport from 'passport';
import * as passportJWT from 'passport-jwt';
import * as configPrivate from '../config.private';
import { handleHttpRequest } from '../utils/requestHandler';
import { AppToken } from './schemas/app-token.interface';
import { authApps } from './schemas/authApps';
import { PacienteToken } from './schemas/paciente-token.interface';
import { UserToken } from './schemas/user-token.interface';

const shiroTrie = require('shiro-trie');

export class Auth {

    /**
     *  TTL JWT Token
     *  @var expiresIn {number}
     *
     * @memberOf Auth
     */

    static expiresIn = 60 * 60 * 8; /* 8 Horas */
    static expiresInTemporaly = 60 * 5;

    /**
     * Devuelve una instancia de shiro. Implementa un cache en el request actual para mejorar la performance
     *
     * @private
     * @static
     * @param {express.Request} req Corresponde al request actual
     *
     * @memberOf Auth
     */
    private static getShiro(req: express.Request | Request): any {
        let shiro = (req as any).shiro;
        if (!shiro) {
            shiro = shiroTrie.new();
            shiro.add((req as any).user.permisos);
            (req as any).shiro = shiro;
        }
        return shiro;
    }


    /**
     * Inicializa el middleware de auditoría para JSON Web Token
     *
     * @static
     * @param {express.Express} app aplicación de Express
     *
     * @memberOf Auth
     */
    static initialize(app: express.Express) {
        // Configura passport para que utilice JWT
        passport.use(new passportJWT.Strategy(
            {
                secretOrKey: configPrivate.auth.jwtKey,
                jwtFromRequest: passportJWT.ExtractJwt.fromExtractors([
                    passportJWT.ExtractJwt.fromAuthHeaderWithScheme('jwt'),
                    passportJWT.ExtractJwt.fromUrlQueryParameter('token')
                ])
            },
            (jwt_payload, done) => {
                done(null, jwt_payload);
            }
        ));

        // Inicializa passport
        app.use(passport.initialize());

    }

    /**
     * Autentica la ejecución de un middleware
     *
     * @static
     * @returns Middleware de Express.js
     *
     * @memberOf Auth
     */
    static authenticate() {
        return [
            passport.authenticate('jwt', { session: false }),
            this.appTokenProtected(),
            this.extractToken(),
            this.recovertPayloadMiddleware()
        ];
    }

    static authenticatePublic() {
        return passport.authenticate();
    }

    static validateToken(token) {
        try {
            const tokenData = jwt.verify(token, configPrivate.auth.jwtKey);
            if (tokenData) {
                return tokenData;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    static validateCaptcha() {
        return async (req, res, next) => {
            if (configPrivate.captcha.enabled && !req.body.scan) {
                try {
                    const recaptcha = req.body.recaptcha;
                    if (!recaptcha) {
                        next(403);
                    }
                    const urlValidacion = `${configPrivate.captcha.url}?secret=${configPrivate.captcha.secret_key}&response=${recaptcha}`;
                    const options = {
                        uri: urlValidacion,
                        method: 'POST',
                        json: true,
                    };
                    const [status, body] = await handleHttpRequest(options);
                    if (status === 200 && body.success) {
                        next();
                    } else {
                        next(403);
                    }
                } catch (err) {
                    next(403);
                }
            } else {
                next();
            }
        };
    }

    /**
     * optionalAuth: extract
     */

    static optionalAuth() {
        return [
            (req, res, next) => {
                try {
                    const extractor = passportJWT.ExtractJwt.fromAuthHeaderWithScheme('jwt');
                    const token = extractor(req);
                    const tokenData = jwt.verify(token, configPrivate.auth.jwtKey);
                    if (tokenData) {
                        req.user = tokenData;
                    }
                    next();
                } catch (e) {
                    next();
                }
            },
            this.recovertPayloadMiddleware()
        ];
    }

    /**
     * Middleware Denied patients access
     *
     * @static
     * @returns Middleware de Express.js
     *
     * @memberOf Auth
     */
    static deniedPatients() {
        return (req, res, next) => {
            if (req.user.type !== 'paciente-token') {
                next();
            } else {
                next(403);
            }
        };
    }

    /**
     * Middleware para controlar los apps token.
     * Controla que el token esta almacenado en la DB.
     * @memberOf Auth
     */
    static appTokenProtected() {
        return async (req, res, next) => {
            if (req.user.type === 'app-token') {
                const app: any = await authApps.findOne({ _id: req.user.app.id });
                let token;
                if (req.headers && req.headers.authorization) {
                    token = req.headers.authorization.substring(4);
                } else if (req.query.token) {
                    token = req.query.token;
                }
                if (app && app.token && app.token === token) {
                    next();
                } else {
                    next(403);
                }
            } else {
                next();
            }
        };
    }

    /**
     * A partir de un token cargar el payload en el request asi sigue la Aplicaicon como corresponde.
     * Cargar permisos, usuarios, organizacion, profesional, etc.
     */
    static recovertPayloadMiddleware() {
        return async (req, res, next) => {
            if (req.user && req.user.type === 'user-token-2' && req.user.organizacion) {
                const { getTokenPayload } = require('./auth.controller');
                const payload = await getTokenPayload(req.token, req.user);
                req.user = {
                    id: req.user.id,
                    type: req.user.type,
                    account_id: req.user.account_id,

                    usuario: payload.usuario,
                    profesional: payload.profesional,
                    permisos: payload.permisos,
                    organizacion: payload.organizacion,
                    feature: payload.feature,
                    pacienteRestringido: payload.pacienteRestringido

                };
                return next();
            } else {
                return next();
            }
        };
    }

    /**
     * Extrack token middleware
     */

    static extractToken() {
        return (req, _res, next) => {
            if (req.headers && req.headers.authorization) {
                req.token = req.headers.authorization.substring(4);
            } else if (req.query.token) {
                req.token = req.query.token;
            }
            next();
        };
    }

    static getUserFromResource(resource: any) {
        const auditData = resource.updatedBy || resource.createdBy;
        const user = {
            usuario: auditData,
            organizacion: auditData.organizacion,
            ip: '0.0.0.0',
            connection: {
                localAddress: '0.0.0.0'
            }
        };
        delete user.usuario.organizacion;
        return { user };
    }


    /**
     * Genera los registros de auditoría en el documento indicado
     *
     * @static
     * @param {mongoose.Document} document Instancia de documento de Mongoose
     * @param {express.Request} req Corresponde al request actual
     *
     * @memberOf Auth
     */
    static audit(document: mongoose.Document, req: express.Request | Request) {
        // Obtiene el usuario o app que está autenticada
        const i = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
        // Copia la organización desde el token
        i.organizacion = (req as any).user.organizacion;
        // El método 'audit' lo define el plugin 'audit'
        (document as any).audit(i);
    }

    /**
     * Controla si el token contiene el string Shiro
     *
     * @static
     * @param {express.Request} req Corresponde al request actual
     * @param {string} string String para controlar permisos
     * @returns {boolean} Devuelve verdadero si el token contiene el permiso
     *
     * @memberOf Auth
     */
    static check(req: express.Request | Request, string: string): boolean {
        if (!(req as any).user || !(req as any).user.permisos) {
            return false;
        } else {
            return this.getShiro(req).check(string);
        }
    }

    /**
     * Middleware Express de control de permisos
     *
     * @static
     * @param {string} permisos Permiso a verificar
     *
     * @memberOf Auth
     */

    static authorize = (permiso: string) => {
        return (req: express.Request | Request, res: express.Response | Response, next) => {
            if (!Auth.check(req, permiso)) {
                return next(403);
            }
            return next();
        };
    };

    /**
     * Obtiene todos los permisos para el string Shiro indicado
     *
     * @static
     * @param {express.Request} req Corresponde al request actual
     * @param {string} string String para controlar permisos
     * @returns {string[]} Array con permisos
     *
     * @memberOf Auth
     */
    static getPermissions(req: express.Request | Request, string: string): string[] {
        if (!(req as any).user || !(req as any).user.permisos) {
            return null;
        } else {
            return this.getShiro(req).permissions(string);
        }
    }

    /**
     * Obtiene la organización
     *
     * @static
     * @param {express.Request} req Corresponde al request actual
     * @returns {string} id de la organización
     *
     * @memberOf Auth
     */
    static getOrganization(req: express.Request | Request, key = 'id'): string {
        if (!(req as any).user || !(req as any).user.organizacion) {
            return null;
        } else {
            return (req as any).user.organizacion[key];
        }
    }

    /**
     * Obtiene el nombre completo del usuario
     *
     * @static
     * @param {express.Request} req Corresponde al request actual
     * @returns {string} nombre y apellido del usuario
     *
     * @memberOf Auth
     */
    static getUserName(req: express.Request): string {
        if (!(req as any).user) {
            return null;
        } else {
            return (req as any).user.usuario.nombreCompleto;
        }
    }

    /**
     * Obtiene datos del profesional
     *
     * @static
     * @param {express.Request} req Corresponde al request actual
     * @returns {string} id de la organización
     *
     * @memberOf Auth
     */
    static getProfesional(req: express.Request): any {
        if (!(req as any).user || !(req as any).user.profesional || !(req as any).user.usuario) {
            return null;
        } else {
            const profesional = {
                id: (req as any).user.profesional,
                nombre: (req as any).user.usuario.nombre,
                apellido: (req as any).user.usuario.apellido,
                documento: (req as any).user.usuario.documento
            };
            return profesional;
        }
    }

    /**
     * Obtiene datos del profesional
     *
     * @static
     * @param {express.Request} req Corresponde al request actual
     * @returns {any} usuario auditado.
     *
     * @memberOf Auth
     */
    static getAuditUser(req: express.Request): any {
        const i = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
        i.organizacion = (req as any).user.organizacion;
        return i;
    }

    /**
     * Version dos del token. Con menos datos.
     * Solo posee el username y la organización.
     */

    static generateUserToken2(username: string, organizacion: ObjectId = null, account_id = null): any {
        // Crea el token con los datos de sesión
        const token: any = {
            id: mongoose.Types.ObjectId(),
            usuario: username,
            organizacion,
            account_id,
            type: 'user-token-2'
        };
        return jwt.sign(token, configPrivate.auth.jwtKey, { expiresIn: this.expiresIn });
    }

    /**
     * Genera un token de usuario firmado
     *
     * @static
     * @param {authUser} user authUserSchema
     * @param {*} organizacion Organización (corresponde a schemas/organizacion)
     * @param {*} permisos Permisos (corresponde a schemas/permisos)
     * @param {*} profesional Permisos (corresponde a core/schemas/profesional)
     * @param {*} account_id Id de la cuenta de la app mobile (opcional)
     * @returns {*} JWT
     *
     * @memberOf Auth
     */

    static generateUserToken(user: any, organizacion: any, permisos: any[], profesional: any, account_id: string = null): any {
        // Crea el token con los datos de sesión
        const token: UserToken = {
            id: mongoose.Types.ObjectId(),
            usuario: {
                id: user._id,
                nombreCompleto: user.nombre + ' ' + user.apellido,
                nombre: user.nombre,
                apellido: user.apellido,
                username: user.usuario,
                documento: user.usuario
            },
            // roles: [permisos.roles],
            profesional,
            organizacion,
            permisos,
            account_id,
            type: 'user-token'
        };
        return jwt.sign(token, configPrivate.auth.jwtKey, { expiresIn: this.expiresIn });
    }

    static generateUserTokenTemporaly(username: string, permisos: Array<any>, organizacion: ObjectId = null, account_id = null): any {
        // Crea el token con los datos de sesión
        const token: any = {
            id: mongoose.Types.ObjectId(),
            usuario: username,
            organizacion,
            account_id,
            permisos,
            type: 'user-token-temp'
        };
        return jwt.sign(token, configPrivate.auth.jwtKey, { expiresIn: this.expiresInTemporaly });
    }

    /**
     * Genera un token de aplicación firmado
     *
     * @static
     * @param {string} nombre Nombre de la aplicación
     * @param {*} organizacion Organización (corresponde a schemas/organizacion)
     * @param {string[]} permisos Array de permisos asignados a la aplicación
     * @returns {*} JWT
     *
     * @memberOf Auth
     */

    static generateAppToken(user: any, organizacion: any, permisos: string[], type: 'app-token' | 'turnero-token' | 'totem-token' = 'app-token'): any {
        // Un token por organización. A futuro distintos permisos en la organización externa deberá modificarse esto!
        const token: AppToken = {
            id: mongoose.Types.ObjectId(),
            app: {
                id: user._id,
                nombre: user.nombre
            },
            organizacion,
            permisos,
            account_id: null,
            type
        };
        return jwt.sign(token, configPrivate.auth.jwtKey);
    }

    /**
     * Genera un token firmado para pacientes con la App Mobile
     *
     * @static
     * @param {string} nombre Nombre del usuario
     * @param {string} apellido Apellido del usuario
     * @param {*} organizacion Organización (corresponde a schemas/organizacion)
     * @param {*} permisos Permisos (corresponde a schemas/permisos)
     * @param {*} profesional Permisos (corresponde a core/schemas/profesional)
     * @returns {*} JWT
     *
     * @memberOf Auth
     */
    static generatePacienteToken(account_id: string, nombre: string, email: string, pacientes: any, permisos: any): any {
        // Crea el token con los datos de sesión
        const token: PacienteToken = {
            id: mongoose.Types.ObjectId(),
            usuario: {
                nombre,
                email,
            },
            permisos,
            pacientes,
            organizacion: null,
            account_id,
            type: 'paciente-token'
        };
        return jwt.sign(token, configPrivate.auth.jwtKey, { expiresIn: this.expiresIn });
    }

    /**
     * Regenera un Access Token para entrar en una nueva organizacion
     * @param token Token para refrescar
     * @param user authUserSchema
     * @param permisos Listado de permisos de la organizacion
     * @param organizacion Organización a registrarse
     *
     * @returns {*} JWT
     *
     * @memberOf Auth
     */
    static refreshToken(token: string, user: any, permisos: any[], organizacion: any) {
        try {
            const tokenData = jwt.verify(token, configPrivate.auth.jwtKey);
            return this.generateUserToken(user, organizacion, permisos, tokenData.profesional, tokenData.account_id);
        } catch (e) {
            return null;
        }
    }

    /**
     * Genera un token para visualizar archivos
     *
     * @static
     * @returns {*} JWT
     *
     * @memberOf Auth
     */
    static generateFileToken(): any {
        // Crea el token con los datos de sesión
        const token = {
            id: mongoose.Types.ObjectId(),
            type: 'file-token'
        };
        return jwt.sign(token, configPrivate.auth.jwtKey, { expiresIn: 60 * 60 * 2 }); // 2 Horas
    }

    /**
    * Genera un token para acceder a la HUDS de un paciente
    *
    * @static
    * @returns {*} JWT
    *
    * @memberOf Auth
    */
    static generateHudsToken(user: any, organizacion: any, paciente: any): any {
        const token = {
            id: mongoose.Types.ObjectId(),
            usuario: {
                id: user._id,
                nombreCompleto: user.nombre + ' ' + user.apellido,
                nombre: user.nombre,
                apellido: user.apellido,
                username: user.usuario,
                documento: user.usuario
            },
            organizacion,
            paciente: mongoose.Types.ObjectId(paciente.id),
            type: 'huds-token'

        };
        return jwt.sign(token, configPrivate.auth.jwtKey, { expiresIn: 60 * 60 }); // 1 Hora
    }

    static refreshAPPToken(token: string) {
        try {
            const tokenData = jwt.verify(token, configPrivate.auth.jwtKey);
            return this.generateUserToken(tokenData.usuario, tokenData.organizacion, tokenData.permisos, tokenData.profesional, tokenData.account_id);
        } catch (e) {
            return null;
        }
    }

    static decode(token: string) {
        return jwt.decode(token);
    }

    /**
    * Verifica el token para acceder a la HUDS de un paciente
    *
    * @static
    * @param {express.Request} req Corresponde al request actual
    * @param {int} paciente Identificador del paciente
    * @returns {boolean} Devuelve verdadero si el token le corresponde al paciente
    *
    * @memberOf Auth
    */

    static checkHudsToken(req: express.Request, paciente) {
        try {
            let tokenSettings;
            if (req.query.hudsToken) {
                tokenSettings = Auth.decode(req.query.hudsToken);
                return (String(tokenSettings.paciente) === String(paciente));
            }
        } catch (e) {
            return null;
        }

        return null;
    }
    static getTokenTimeLeft(token: any): number {
        let timeLeft = 0;
        const decodedToken: any = jwt.decode(token);
        if (!decodedToken || !decodedToken.exp) {
            timeLeft = -1;
        } else {
            const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
            timeLeft = decodedToken.exp - currentTime;
        }
        return timeLeft;
    }

    static async authorizeByToken(req: Request, res: Response, next: express.NextFunction, requiredPermissions: string[]) {
        const permisos = req.user.permisos || [];
        const paciente = req.query?.pacienteId || null;
        let userMobile = false;

        if (req.user.type === 'paciente-token' && paciente) {
            const pacienteUser = req.user.pacientes.find(p => String(p.id) === String(paciente));
            userMobile = pacienteUser ? true : false;
        }

        const hasPermission = requiredPermissions.some(perm =>
            permisos.includes(perm) || permisos.includes(perm.split(':')[0] + ':*')
        );
        return !hasPermission && !userMobile ? next(403) : next();
    }
}
