import * as crypto from 'crypto';
import * as express from 'express';
import { SharedLog } from '../shared.log';

const router = express.Router();

/**
 * Normaliza la información de los errores recibidos desde Angular.
 * Permite conservar datos que lleguen como objetos en lugar de strings.
 */
function normalizeError(value: any, maxLength: number): string {
    if (value === undefined || value === null) {
        return '';
    }

    if (typeof value === 'string') {
        return value.substring(0, maxLength);
    }

    if (value instanceof Error) {
        return value.message.substring(0, maxLength);
    }

    try {
        return (JSON.stringify(value) || String(value)).substring(0, maxLength);
    } catch {
        // Evitamos que un objeto no serializable impida registrar el error.
        return String(value).substring(0, maxLength);
    }
}

/**
 * Registra errores capturados desde Angular mediante @andes/shared.
 */
router.post('/error', async (req, res, next) => {
    try {
        const error = req.body || {};
        const message = normalizeError(error.message, 2000);
        const stack = normalizeError(error.stack, 8000);

        // Identificador estable para reconocer errores iguales.
        const id = crypto.createHash('md5')
            .update(message)
            .digest('hex');

        const objetoLog = {
            _id: id,
            message,
            stack
        };

        await SharedLog.error('frontend', objetoLog, undefined, req);

        return res.sendStatus(204);
    } catch (err) {
        return next(err);
    }
});

export = router;
