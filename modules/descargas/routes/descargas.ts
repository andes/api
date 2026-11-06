import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import * as SendEmail from './../../../utils/roboSender/sendEmail';
import * as configPrivate from './../../../config.private';
import moment = require('moment');
import { InformeRUP } from '../informe-rup/informe-rup';
import { Prestacion } from '../../rup/schemas/prestacion';
import { InformeCenso } from '../informe-censo/informe-censo';
import { InformeTurnos } from '../informe-turnos/informe-turnos';
import { RecuperoCosto } from '../recupero-costo/recupero-costo';
import { ConstanciaPuco } from '../puco/constancia-puco';
import { Derivacion } from '../com/derivacion';
import { Arancelamiento } from '../arancelamiento/arancelamiento';
import { Agenda } from '../agenda/agenda';
import { getArchivoAdjunto } from '../../../modules/rup/controllers/rup';
import { CertificadoEtica } from '../matriculaciones/certificado-etica';
import { CredencialProfesional } from '../matriculaciones/credencial-profesional';
import { Laboratorio } from '../laboratorio/laboratorio';
import * as laboratorioController from './../../rup/laboratorios.controller';
import { laboratorioLog } from './../../rup/laboratorio.log';
import { Paciente } from './../../../core-v2/mpi';
import { FichaEpidemiologica } from '../ficha-epidemiologica/ficha';
import { Forms } from '../../forms/forms.schema';

const router = express.Router();

function sendPdf(res: any, pdfBuffer: Buffer, options: { filename?: string; disposition?: 'inline' | 'attachment' } = {}) {
    const filename = options.filename || 'informe.pdf';
    const disposition = options.disposition || 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    return res.send(pdfBuffer);
}

router.post('/reporteDerivacion', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const derivacion = new Derivacion(req);
        const opciones = { margin: { top: '3cm' } };
        const pdfBuffer = await derivacion.informe(opciones);
        return sendPdf(res, pdfBuffer, { filename: 'reporte-derivacion.pdf', disposition: 'attachment' });
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
    const opciones = { margin: { top: '6cm' } };
    const pdfBuffer = await docCenso.informe(opciones);

    return sendPdf(res, pdfBuffer);
});


router.post('/censoMensual', async (req: any, res, next) => {
    const docCenso = new InformeCenso('mensual', req);
    const opciones = { margin: { top: '6cm' }, landscape: true };
    const pdfBuffer = await docCenso.informe(opciones);

    return sendPdf(res, pdfBuffer);
});

router.post('/anexo-dos', async (req: any, res) => {
    const docRecupero = new RecuperoCosto(req);
    const opciones = { margin: { top: '3cm' } };
    const pdfBuffer = await docRecupero.informe(opciones);

    return sendPdf(res, pdfBuffer, { filename: 'anexo-dos.pdf', disposition: 'attachment' });
});

/**
 * Get para descarga de prestación por idPrestacion y opcionalmente por idRegistro si viene el parametro
 */
router.get('/rup/:idPrestacion/(:idRegistro)?', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const idPrestacion = req.params.idPrestacion;
        const idRegistro = req.params.idRegistro;
        const informe = new InformeRUP(idPrestacion, idRegistro, req.user);
        const pdfBuffer = await informe.informe();

        return sendPdf(res, pdfBuffer, {
            filename: `informe-${idPrestacion}${idRegistro ? `-${idRegistro}` : ''}.pdf`,
            disposition: 'attachment'
        });
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
            const pdfBuffer = await informe.informe();

            const html = await SendEmail.renderHTML('emails/email-informe.html', handlebarsData);
            const data = {
                to: email,
                subject: handlebarsData.procesoProcedencia + ' - ' + procedimiento + ' - PACIENTE ' + handlebarsData.paciente.nombre + ' ' + handlebarsData.paciente.apellido + ' - PROFESIONAL  ' + handlebarsData.profesional.nombre + ' ' + handlebarsData.profesional.apellido,
                html,
                attachments: [
                    {
                        filename: `informe-${moment(handlebarsData.fechaInicio).format('DD-MM-YYYY-H-mm-ss')}.pdf`,
                        content: pdfBuffer
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
    const opciones = { margin: { top: '3cm' } };
    const pdfBuffer = await docPuco.informe(opciones);

    return sendPdf(res, pdfBuffer);
});

router.post('/laboratorio/:tipo?', Auth.authenticate(), async (req: any, res, next) => {
    let dataSearch;

    if (req.body.protocolo.data.idProtocolo && req.body.protocolo.data.documento) {
        try {
            const paciente = await Paciente.find({ documento: req.body.protocolo.data.documento });
            if (!paciente || !paciente.length) {
                throw new Error('Ocurrió un error generando el archivo.');
            }

            if (req.user.type === 'paciente-token') {
                const tieneAcceso = paciente.some(p =>
                    req.user.pacientes?.some(up => String(up.id) === String(p._id))
                );
                if (!tieneAcceso) {
                    return res.status(403).send('No tiene permisos para acceder a este recurso.');
                }
            }

            dataSearch = { idProtocolo: req.body.protocolo.data.idProtocolo };
            const response = await laboratorioController.search(dataSearch);
            if (!response.length) {
                throw new Error('Ocurrió un error generando el archivo.');
            }
            const docLaboratorio = new Laboratorio(req.body.protocolo, response, paciente, req.body.usuario, req.user.type);
            const opciones = { margin: { top: '2cm' } };
            const pdfBuffer = await docLaboratorio.informe(opciones);

            return sendPdf(res, pdfBuffer);

        } catch (err) {
            await laboratorioLog.error('laboratorio-descargas', req.body.protocolo.data, err, req);
            return next(err);
        }

    } else {
        await laboratorioLog.error('laboratorio-descargas', req.body, req);
        return next(404);
    }
});

router.post('/fichaEpidemiologia/:tipo?', Auth.authenticate(), async (req: any, res, next) => {
    if (req.body.ficha.type.id) {
        try {
            const ficha = await Forms.findById(req.body.ficha.type.id);
            if (!ficha) {
                throw new Error(`Error al generar ficha de ${req.body.ficha.type.name}`);
            }
            const docFichaEpidemiologica = new FichaEpidemiologica(req.body.ficha, req.body.usuario, ficha);
            const opciones = { margin: { top: '2.5cm', bottom: '3.5cm' } };
            const pdfBuffer = await docFichaEpidemiologica.informe(opciones);

            return sendPdf(res, pdfBuffer);
        } catch (err) {
            return next(err);
        }
    } else {
        return next(500);
    }
});

router.post('/arancelamiento/:tipo?', Auth.authenticate(), async (req: any, res) => {
    const provincia = configPrivate.provincia || 'neuquen';
    const opciones = { margin: { top: '3cm' } };
    let pdfBuffer: Buffer;
    if (provincia === 'neuquen') {
        const docPuco = new Arancelamiento(req);
        pdfBuffer = await docPuco.informe(opciones);
    } else {
        const docRecupero = new RecuperoCosto(req);
        pdfBuffer = await docRecupero.informe(opciones);
    }
    return sendPdf(res, pdfBuffer);
});

router.post('/agenda/:id', Auth.authenticate(), async (req: any, res) => {
    const opciones = { margin: { top: '3cm' }, landscape: true };
    const docAgenda = new Agenda(req);
    const pdfBuffer = await docAgenda.informe(opciones);

    return sendPdf(res, pdfBuffer);
});

// Certificado de etica para profesional desde matriculaciones
router.post('/certificadoEtica', Auth.authenticate(), async (req: any, res) => {
    const certificado = new CertificadoEtica(req);
    const opciones = { margin: { top: '3cm' } };
    const pdfBuffer = await certificado.informe(opciones);

    return sendPdf(res, pdfBuffer);
});

//
router.get('/credencialProfesional/:idProfesional/:idFormacionGrado/:qrcode', Auth.authenticate(), async (req: any, res) => {
    const idProfesional = req.params.idProfesional;
    const idFormacionGrado = req.params.idFormacionGrado;
    const qrcode = req.params.qrcode;
    const certificado = new CredencialProfesional(idProfesional, idFormacionGrado, qrcode);
    const opciones = { margin: { top: '3cm' } };
    const pdfBuffer = await certificado.informe(opciones);

    return sendPdf(res, pdfBuffer);
});

router.post('/listadoTurnos', Auth.authenticate(), async (req: any, res, next) => {
    const opciones = { margin: { top: '3cm' } };
    const docTurnos = new InformeTurnos(req);
    const pdfBuffer = await docTurnos.informe(opciones);

    return sendPdf(res, pdfBuffer);
});

/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/:tipo?', Auth.authenticate(), async (req: any, res, next) => {
    try {
        const idPrestacion = req.body.idPrestacion;
        const idRegistro = req.body.idRegistro;
        const snapshots = req.body.snapshots;

        const informe = new InformeRUP(idPrestacion, idRegistro, req.user, snapshots);
        const pdfBuffer = await informe.informe();

        return sendPdf(res, pdfBuffer);
    } catch (err) {
        return next(err);
    }
});


export = router;
