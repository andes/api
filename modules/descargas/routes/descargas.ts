import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import * as SendEmail from './../../../utils/roboSender/sendEmail';
import * as configPrivate from './../../../config.private';
import moment = require('moment');
import { InformeRUP } from '../informe-rup/informe-rup';
import { Prestacion } from '../../rup/schemas/prestacion';
import { InformeCenso } from '../informe-censo/informe-censo';
import { RecuperoCosto } from '../recupero-costo/recupero-costo';
import { ConstanciaPuco } from '../puco/constancia-puco';
import { Derivacion } from '../com/derivacion';

const router = express.Router();

router.post('/comprobanteDerivacion', async (req: any, res) => {
    let derivacion = new Derivacion(req);
    const opciones = { header: { height: '3cm' } };
    const fileName: any = await derivacion.informe(opciones);
    res.download(fileName);
});

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

router.post('/anexo-dos', async (req: any, res) => {
    let docRecupero = new RecuperoCosto(req);
    const opciones = { header: { height: '3cm' } };
    const fileName: any = await docRecupero.informe(opciones);

    res.download(fileName);
});

/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/:tipo?', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const idPrestacion = req.body.idPrestacion;
        const idRegistro = req.body.idRegistro;

        const informe = new InformeRUP(idPrestacion, idRegistro, req.user);
        const fileName = await informe.informe();

        return res.download(fileName);
    } catch (err) {
        return next(err);
    }
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


router.post('/constanciaPuco/:tipo?', async (req: any, res) => {
    let docPuco = new ConstanciaPuco(req);
    const opciones = { header: { height: '3cm' } };
    const fileName: any = await docPuco.informe(opciones);

    res.download(fileName);
});

export = router;
