import * as express from 'express';
import { Documento } from '../controller/descargas-puco';
import { Auth } from '../../../auth/auth.class';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import * as SendEmail from './../../../utils/roboSender/sendEmail';
import * as configPrivate from './../../../config.private';
import moment = require('moment');
import { InformeRUP } from '../informe-rup/informe-rup';
import { model as Prestacion } from '../../rup/schemas/prestacion';
import { InformeCenso } from '../informe-censo/informe-censo';

const router = express.Router();


/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/censo', async (req: any, res, next) => {
    let docCenso = new InformeCenso('diario', req);
    const fileName: any = await docCenso.informe();

    return res.download(fileName);
});


router.post('/censoMensual', async (req: any, res, next) => {
    let docCenso = new InformeCenso('mensual', req);
    const fileName: any = await docCenso.informe();

    return res.download(fileName);
});

/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/:tipo?', Auth.authenticate(), async (req: any, res, next) => {
    const idPrestacion = req.body.idPrestacion;
    const idRegistro = req.body.idRegistro;

    const informe = new InformeRUP(idPrestacion, idRegistro, req.user);
    const fileName = await informe.informe();

    return res.download(fileName);
});

// envío de resumen de prestación por correo
router.post('/send/:tipo', Auth.authenticate(), async (req, res, next) => {
    const email = req.body.email;
    const idPrestacion = req.body.idPrestacion;
    const idRegistro = req.body.idRegistro;

    const prestacion: any = await Prestacion.findById(idPrestacion);
    let procedimiento = '';

    if (idRegistro) {
        const registro = prestacion.findRegistroById(idRegistro);
        procedimiento = registro.concepto.term.toUpperCase();
    } else {
        procedimiento = prestacion.solicitud.tipoPrestacion.term.toUpperCase();
    }

    const handlebarsData = {
        procesoProcedencia: prestacion.solicitud.ambitoOrigen.toUpperCase(),
        organizacion: prestacion.ejecucion.organizacion.nombre,
        fechaInicio: prestacion.ejecucion.fecha,
        procedimiento,
        profesional: prestacion.solicitud.profesional,
        paciente: prestacion.paciente,

    };
    const idOrganizacion = req.body.idOrganizacion;
    const org: any = await Organizacion.findById(idOrganizacion);
    let emailFiltrado = null;
    if (org && org.configuraciones && org.configuraciones.emails) {
        emailFiltrado = org.configuraciones.emails.filter(x => x.email === email);
    }
    if (emailFiltrado) {
        try {
            // const archivo = await Documento.descargar(req, res, next);
            const informe = new InformeRUP(idPrestacion, idRegistro, req.user);
            const fileName = await informe.informe();

            const html = await SendEmail.renderHTML('emails/email-informe.html', handlebarsData);
            const data = {
                from: `ANDES <${configPrivate.enviarMail.auth.user}>`,
                to: email,
                subject: handlebarsData.procesoProcedencia + ' - ' + procedimiento + ' - PACIENTE ' + handlebarsData.paciente.nombre + ' ' + handlebarsData.paciente.apellido + ' - PROFESIONAL  ' + handlebarsData.profesional.nombre + ' ' + handlebarsData.profesional.apellido,
                text: '',
                html,
                attachments: {
                    filename: `informe-${moment(handlebarsData.fechaInicio).format('DD-MM-YYYY-H-mm-ss')}.pdf`,
                    path: fileName
                }
            };
            await SendEmail.sendMail(data);
            res.json({ status: 'OK' });
        } catch (e) {
            next(e);
        }
    } else {
        next('No es un correo válido para la organización');
    }
});


router.post('/constanciaPuco/:tipo?', (req: any, res, next) => {
    Documento.descargarDocPuco(req, res, next).then(archivo => {
        res.download((archivo as string), (err) => {
            if (err) {
                next(err);
            } else {
                next();
            }
        });
    }).catch(e => {
        return next(e);
    });
});

export = router;
