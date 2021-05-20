import * as configPrivate from '../../../config.private';
import * as SendEmail from '../../../utils/roboSender/sendEmail';
import { Derivacion } from '../../../modules/descargas/com/derivacion';
const moment = require('moment');

export async function sendMailComprobanteDerivacion(derivacion, email) {
    const body = { derivacionId: derivacion._id };
    const comprobante = new Derivacion({ body });
    const opciones = { header: { height: '3cm' } };
    const fileName: any = await comprobante.informe(opciones);
    const fechaFinalizacion = moment(derivacion.historial.createdAt).format('DD/MM/YYYY');

    let attachments = [{
        filename: `comprobante derivacion ${derivacion.paciente.nombre}${derivacion.paciente.apellido}-${fechaFinalizacion}.pdf`,
        path: fileName
    }];

    const handleBarsData = {
        asunto: 'Aviso de derivación finalizada',
        mensaje: `El paciente ${derivacion.paciente.nombre} ${derivacion.paciente.apellido}
            DNI ${derivacion.paciente.documento}
            ha arribado a destino a ${derivacion.organizacionDestino.nombre}
            el día ${fechaFinalizacion}.
            Descargue el comprobante adjunto.`
    };
    const html = await SendEmail.renderHTML('emails/emailGenerico.html', handleBarsData);
    const data = {
        from: `ANDES <${configPrivate.enviarMail.auth.user}>`,
        to: email,
        subject: `Comprobante de derivación ${derivacion.paciente.nombre} ${derivacion.paciente.apellido} ${fechaFinalizacion}`,
        text: '',
        html,
        attachments
    };

    SendEmail.sendMail(data);
}
