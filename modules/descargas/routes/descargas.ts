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
import { Arancelamiento } from '../arancelamiento/arancelamiento';
import { Agenda } from '../agenda/agenda';
import { getArchivoAdjunto } from '../../../modules/rup/controllers/rup';
import { CertificadoEtica } from '../matriculaciones/certificado-etica';
import { CredencialProfesional } from '../matriculaciones/credencial-profesional';

const router = express.Router();

router.post('/reporteDerivacion', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const derivacion = new Derivacion(req);
        const opciones = { header: { height: '3cm' } };
        const fileName: any = await derivacion.informe(opciones);
        res.download(fileName);
    } catch (err) {
        return next(err);
    }
});

/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/censo', async (req: any, res, next) => {
    const docCenso = new InformeCenso('diario', req);
    const fileName: any = await docCenso.informe();

    return res.download(fileName);
});


router.post('/censoMensual', async (req: any, res, next) => {
    const docCenso = new InformeCenso('mensual', req);
    const opciones = { header: { height: '4.5cm' }, orientation: 'landscape' };
    const fileName: any = await docCenso.informe(opciones);

    return res.download(fileName);
});

router.post('/anexo-dos', async (req: any, res) => {
    const docRecupero = new RecuperoCosto(req);
    const opciones = { header: { height: '3cm' } };
    const fileName: any = await docRecupero.informe(opciones);

    res.download(fileName);
});

/**
 * Get para descarga de prestación por idPrestacion y opcionalmente por idRegistro si viene el parametro
 */
router.get('/rup/:idPrestacion/(:idRegistro)?', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const idPrestacion = req.params.idPrestacion;
        const idRegistro = req.params.idRegistro;
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
    const adjuntos = req.body.adjuntos;

    const prestacion: any = await Prestacion.findById(idPrestacion);
    let procedimiento = '';
    const attachments = [];

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


    if (adjuntos) {
        let count = 0;
        const fecha = moment(handlebarsData.fechaInicio).format('DD-MM-YYYY-H-mm-ss');
        for (const adj of adjuntos) {
            count++;
            const stream = await getArchivoAdjunto(adj.id);
            attachments.push({
                content: stream,
                filename: `adjunto_${count} - ${fecha}.${adj.ext}`
            });
        }
    }

    if (emailFiltrado) {
        try {
            const informe = new InformeRUP(idPrestacion, idRegistro, req.user);
            const fileName = await informe.informe();

            const html = await SendEmail.renderHTML('emails/email-informe.html', handlebarsData);
            const data = {
                to: email,
                subject: handlebarsData.procesoProcedencia + ' - ' + procedimiento + ' - PACIENTE ' + handlebarsData.paciente.nombre + ' ' + handlebarsData.paciente.apellido + ' - PROFESIONAL  ' + handlebarsData.profesional.nombre + ' ' + handlebarsData.profesional.apellido,
                html,
                attachments: [
                    {
                        filename: `informe-${moment(handlebarsData.fechaInicio).format('DD-MM-YYYY-H-mm-ss')}.pdf`,
                        path: fileName
                    },
                    ...attachments
                ]
            };

            await SendEmail.sendMail(
                data,
                org.configuraciones?.servicioEmail
            );

            res.json({ status: 'OK' });

        } catch (e) {
            next(e);
        }
    } else {
        next('No es un correo válido para la organización');
    }
});


router.post('/constanciaPuco/:tipo?', Auth.authenticate(), async (req: any, res) => {
    const docPuco = new ConstanciaPuco(req);
    const opciones = { header: { height: '3cm' } };
    const fileName: any = await docPuco.informe(opciones);

    res.download(fileName);
});

router.post('/arancelamiento/:tipo?', Auth.authenticate(), async (req: any, res) => {
    const provincia = configPrivate.provincia || 'neuquen';
    const opciones = { header: { height: '3cm' } };
    let fileName: any;
    if (provincia === 'neuquen') {
        const docPuco = new Arancelamiento(req);
        fileName = await docPuco.informe(opciones);
    } else {
        const docRecupero = new RecuperoCosto(req);
        fileName = await docRecupero.informe(opciones);
    }
    res.download(fileName);
});

router.post('/agenda/:id', Auth.authenticate(), async (req: any, res) => {
    const opciones = { header: { height: '3cm' }, orientation: 'landscape' };
    const docAgenda = new Agenda(req);
    const fileName = await docAgenda.informe(opciones);
    res.download(fileName);
});

// Certificado de etica para profesional desde matriculaciones
router.post('/certificadoEtica', Auth.authenticate(), async (req: any, res) => {
    const certificado = new CertificadoEtica(req);
    const opciones = { header: { height: '3cm' } };
    const fileName = await certificado.informe(opciones);
    return res.download(fileName);
});

//
router.get('/credencialProfesional/:idProfesional/:idFormacionGrado/:qrcode', Auth.authenticate(), async (req: any, res) => {
    const idProfesional = req.params.idProfesional;
    const idFormacionGrado = req.params.idFormacionGrado;
    const qrcode = req.params.qrcode;
    const certificado = new CredencialProfesional(idProfesional, idFormacionGrado, qrcode);
    const opciones = { header: { height: '3cm' } };
    const fileName = await certificado.informe(opciones);
    return res.download(fileName);
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


export = router;
