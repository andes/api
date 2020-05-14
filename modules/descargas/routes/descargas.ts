import * as express from 'express';
import { Documento } from './../controller/descargas';
import { Auth } from '../../../auth/auth.class';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { DocumentoCenso } from './../controller/descargaCenso';
import { DocumentoCensoMensual } from './../controller/descargaCensoMensual';
import { exportarInternaciones } from '../../../jobs/exportarInternaciones';
import * as SendEmail from './../../../utils/roboSender/sendEmail';
import * as configPrivate from './../../../config.private';
import moment = require('moment');


const router = express.Router();


/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/censo', (req: any, res, next) => {
    let docCenso = new DocumentoCenso();
    docCenso.descargar(req, res, next).then(archivo => {
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


router.post('/censoMensual', (req: any, res, next) => {
    let docCenso = new DocumentoCensoMensual();
    docCenso.descargar(req, res, next).then(archivo => {
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

/**
 * Se usa POST para generar la descarga porque se envían datos
 * que van a ser parte del archivo
 */
router.post('/:tipo?', Auth.authenticate(), (req: any, res, next) => {
    Documento.descargar(req, res, next).then(archivo => {
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

// envío de resumen de prestación por correo
router.post('/send/:tipo', Auth.authenticate(), async (req, res, next) => {
    const email = req.body.email;
    const prestacion: any = await Documento.getPrestacionData(req.body.idPrestacion);
    let procedimiento = '';

    if (req.body.idRegistro) {
        const registro = prestacion.findRegistroById(req.body.idRegistro);
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
            const archivo = await Documento.descargar(req, res, next);
            const html = await SendEmail.renderHTML('emails/email-informe.html', handlebarsData);
            const data = {
                from: `ANDES <${configPrivate.enviarMail.auth.user}>`,
                to: email,
                subject: procedimiento + ' ' + `${moment(handlebarsData.fechaInicio).format('DD/MM/YYYY H:mm [hs]')}`,
                text: '',
                html,
                attachments: {
                    filename: `informe-${moment(handlebarsData.fechaInicio).format('DD-MM-YYYY-H-mm-ss')}.pdf`,
                    path: archivo
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


router.post('/internaciones/Csv', async (req, res, next) => {
    const hoy = moment().format('HH:mm:ss');
    const csv = require('fast-csv');

    if (req.body.filtros && req.body.organizacion) {
        try {
            let data = await exportarInternaciones(req.body.filtros, req.body.organizacion);
            res.setHeader('Content-disposition', 'attachment; filename=internaciones.csv');
            res.set('Content-Type', 'text/csv');
            res.status(200);
            csv.write(data, {
                headers: true, transform: (row) => {
                    return { ...row };
                }
            }).pipe(res);
        } catch (err) {
            return next(err);
        }
    }
});

export = router;
