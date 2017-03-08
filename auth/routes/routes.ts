import * as express from 'express';
import * as passport from 'passport';
import * as jwt from 'jsonwebtoken';
import * as config from '../../config';
let router = express.Router();

// TODO: Revisar esta documentación con el nuevo formato Swagger
/**
 * @swagger
 * /me:
 *   get:
 *     summary: Devuelve el payload del token JWT si está autenticado
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Ok
 *       401:
 *         description: Unauthorized
 */
router.get('/me', passport.authenticate('jwt', { session: false }),
    function (req, res) {
        res.json((req as any).user);
    }
);

// TODO: Revisar esta documentación con el nuevo formato Swagger
/**
 * @swagger
 * /login':
 *   post:
 *     summary: Genera un JWT de autenticación
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         description: Nombre de usuario
 *         in: body
 *         required: true
 *         type: string
 *       - name: password
 *         description: Nombre de usuario
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Ok
 *       401:
 *         description: Unauthorized
 */
router.post('/login', function (req, res, next) {
    // if (!req.body.username || !req.body.password || !req.body.organizacion) {
    //     return next(401);
    // }

    // TODO: Llamar a servidor LDAP
    // user.get(req.body.username, req.body.password, function (err, data) {
    //     if (err) {
    //         return next(err);
    //     }

    //     let token = jwt.sign({
    //         sub: data.id,
    //         id: data.id,
    //         name: data.name,
    //         avatar: (data.avatar) ? data.avatar : '',
    //         given_name: data.given_name,
    //         family_name: data.family_name,
    //         scope: {
    //             variables: data.variables,
    //         }
    //     }, config.jwtPrivateKey, {
    //             expiresIn: 3000000
    //         });
    //     res.json({
    //         token: token
    //     });
    // });
    let token = {
        id: '26108063',
        usuario: {
            nombreCompleto: 'Juan Francisco Gabriel',
            nombre: 'Juan',
            apellido: 'Gabriel',
            username: '26108063',
            documento: '26108063'
        },
        roles: ['medico'],
        organizacion: {
            id: 1,
            nombre: 'Hospital Provincial Neuquén'
        },
        permisos: [
            'printer:xpc5000:print',
            'printer:xpc4000:*',
            'printer:hp,samsung:read',
        ]
    };
    res.json({
        token: jwt.sign(token, config.jwtPrivateKey, { expiresIn: 3000000 })
    });
});

export = router;
