import { AppToken } from './schemas/app-token.interface';
import { UserToken } from './schemas/user-token.interface';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as passport from 'passport';
import * as passportJWT from 'passport-jwt';
import * as jwt from 'jsonwebtoken';
import * as configPrivate from '../config.private';
let shiroTrie = require('shiro-trie');

export class Auth {
    /**
     * Devuelve una instancia de shiro. Implementa un cache en el request actual para mejorar la performance
     *
     * @private
     * @static
     * @param {express.Request} req Corresponde al request actual
     *
     * @memberOf Auth
     */
    private static getShiro(req: express.Request): any {
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
                jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeader()
            },
            function (jwt_payload, done) {
                // TODO: Aquí se puede implementar un control del token, por ejemplo si está vencida, rechazada, etc.
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
        return passport.authenticate('jwt', { session: false });
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
    static audit(document: mongoose.Document, req: express.Request) {
        // Obtiene el usuario o app que está autenticada
        let i = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
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
    static check(req: express.Request, string: string): boolean {
        if (!(req as any).user || !(req as any).user.permisos) {
            return false;
        } else {
            return this.getShiro(req).check(string);
        }
    }

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
    static getPermissions(req: express.Request, string: string): string[] {
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
    static getOrganization(req: express.Request): string {
        if (!(req as any).user || !(req as any).user.organizacion) {
            return null;
        } else {
            return (req as any).user.organizacion.id;
        }
    }

    /**
     * Genera un token de usuario firmado
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
    static generateUserToken(nombre: string, apellido: string, organizacion: any, permisos: any, profesional: any): any {
        // Crea el token con los datos de sesión
        let token: UserToken = {
            id: mongoose.Types.ObjectId(),
            usuario: {
                nombreCompleto: nombre + ' ' + apellido,
                nombre: nombre,
                apellido: apellido,
                username: permisos.usuario,
                documento: permisos.usuario
            },
            roles: [permisos.roles],
            profesional: profesional,
            organizacion: organizacion,
            permisos: permisos.permisos
        };
        return jwt.sign(token, configPrivate.auth.jwtKey, { expiresIn: 60 * 60 * 24 * 10 /* 10 días */ });
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
    static generateAppToken(nombre: string, organizacion: any, permisos: string[]): any {
        // Crea el token con los datos de sesión
        let token: AppToken = {
            id: mongoose.Types.ObjectId(),
            app: {
                nombre: nombre
            },
            organizacion: organizacion,
            permisos: permisos
        };
        return jwt.sign(token, configPrivate.auth.jwtKey);
    }
}
