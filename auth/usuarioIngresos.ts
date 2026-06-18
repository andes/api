import { UsuarioIngreso } from './schemas/usuarioIngresos.schema';
import * as moment from 'moment';

function parseUserAgent(uaString: string): { tipo: string; os: string } {
    if (!uaString) {
        return { tipo: 'Unknown', os: 'Unknown' };
    }
    const ua = uaString.toLowerCase();

    let tipo = 'Desktop';
    if (/mobile|android.*mobile|iphone|ipod|blackberry|windows phone/i.test(uaString)) {
        tipo = 'Mobile';
    } else if (/tablet|ipad|android(?!.*mobile)/i.test(uaString)) {
        tipo = 'Tablet';
    }

    let os = 'Unknown';
    if (/windows nt 10/i.test(ua)) {
        os = 'Windows 10';
    } else if (/windows nt 6\.3/i.test(ua)) {
        os = 'Windows 8.1';
    } else if (/windows nt 6\.2/i.test(ua)) {
        os = 'Windows 8';
    } else if (/windows nt 6\.1/i.test(ua)) {
        os = 'Windows 7';
    } else if (/windows/i.test(ua)) {
        os = 'Windows';
    } else if (/android/i.test(ua)) {
        const match = ua.match(/android\s([\d.]+)/);
        os = match ? `Android ${match[1]}` : 'Android';
    } else if (/iphone os|ipad/i.test(ua)) {
        const match = ua.match(/os ([\d_]+)/);
        os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
    } else if (/mac os x/i.test(ua)) {
        os = 'macOS';
    } else if (/linux/i.test(ua)) {
        os = 'Linux';
    }

    return { tipo, os };
}

export async function logUsuarioIngreso(req, user, organizacion) {
    let bucketNumber = 0;
    let retry = true;
    while (retry) {
        try {
            await execLogIngreso(req, user, organizacion, bucketNumber);
            retry = false;
        } catch (err) {
            if (err.code === 17419 || err.code === 11000) {
                bucketNumber++;
            } else {
                retry = false;
                throw err;
            }
        }
    }
}

async function execLogIngreso(req, user, organizacion, bucketNumber) {
    const now = new Date();
    const start = moment(now).startOf('quarter').toDate();

    const uaString = req.headers['user-agent'] || '';
    const { tipo: deviceType, os } = parseUserAgent(uaString);
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null)
        || req.ip
        || req.connection?.remoteAddress
        || '';
    const ip = rawIp.startsWith('::ffff:') ? rawIp.substring(7) : rawIp;

    return UsuarioIngreso.update(
        {
            'usuario.id': user.id || user._id,
            start,
            bucketNumber
        },
        {
            $inc: { cantidad: 1 },
            $setOnInsert: {
                usuario: {
                    id: user.id || user._id,
                    usuario: user.usuario || user.username
                },
                start,
                bucketNumber
            },
            $push: {
                ingresos: {
                    fecha: now,
                    organizacion: {
                        id: organizacion.id || organizacion._id,
                        nombre: organizacion.nombre
                    },
                    device: {
                        ip,
                        tipo: deviceType,
                        os
                    }
                }
            }
        },
        { upsert: true }
    );
}
