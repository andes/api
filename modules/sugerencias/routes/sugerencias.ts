import * as express from 'express';
import * as SendEmail from './../../../utils/roboSender/sendEmail';
import * as configPrivate from './../../../config.private';

// Routes
const router = express.Router();

router.post('/', (req, res) => {
    const body = req.body;
    const usuario: any = (req as any).user;
    req.body['usuario'] = usuario.usuario.username ? usuario.usuario.username : '';
    req.body['organizacion'] = usuario.organizacion.nombre ? usuario.organizacion.nombre : '';
    // renderizacion del email
    SendEmail.renderHTML('emails/email-sugerencias.html', body).then((html) => {
        const data = {
            from: configPrivate.enviarMail.auth.user,
            to: configPrivate.enviarMail.auth.user,
            subject: body.subject,
            text: body.texto,
            html,
            attachments: body.screenshot
        };
        SendEmail.sendMail(data).then(
            () => {
                res.json({
                    mensaje: 'Ok'
                });
            },
            () => {
                res.json({
                    mensaje: 'SERVICE UNAVAILABLE'
                });
            }
        );
    });
});

export = router;
