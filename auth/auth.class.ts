import * as express from 'express';
import * as passport from 'passport';
import * as passportJWT from 'passport-jwt';
import * as config from '../config';

export class Auth {
    static initialize(app: express.Express) {
        // Inicializa los métodos de passport
        // passport.serializeUser(function (user, done) {
        //     console.log('serializeUser');
        //     done(null, user);
        // });
        // passport.deserializeUser(function (user, done) {
        //     console.log('deserializeUser');
        //     done(null, user);
        // });

        // Configura passport para que utilice JWT
        passport.use(new passportJWT.Strategy(
            {
                secretOrKey: config.jwtPrivateKey,
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

    static authenticate() {
        return passport.authenticate('jwt', { session: false });
    }
}
