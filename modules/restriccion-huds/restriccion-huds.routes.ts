import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import { Auth } from '../../auth/auth.class';
import * as configPrivate from '../../config.private';
import { readFile, storeFile, deleteFile } from './archivos/controller/restriccionHudsStore';

const router = express.Router();

/**
 * Valida que el archivo se acceda con un file-token válido (generado en /auth/file-token).
 * Se usa en el GET porque las etiquetas <img> del frontend no pueden enviar headers de autorización.
 */
function validarFileToken(req, res, next) {
    const token = req.query.token;
    try {
        const tokenData = jwt.verify(token, configPrivate.auth.jwtKey);
        if (tokenData.type === 'file-token') {
            return next();
        }
    } catch (e) {
        // token inválido o ausente
    }
    return next(403);
}

router.get('/store/:id', validarFileToken, (req, res, next) => {
    readFile(req.params.id).then((data: any) => {
        res.contentType(data.file.contentType);
        data.stream.on('data', (data2) => {
            res.write(data2);
        });
        data.stream.on('end', () => {
            res.end();
        });
    }).catch(next);
});

router.post('/store', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'usuarios:write')) {
        return next(403);
    }
    const file = req.body.file;
    const metadata = req.body.metadata;
    storeFile(file, metadata).then((data) => {
        res.json(data);
    }).catch(next);
});

router.delete('/store/:id', Auth.authenticate(), (req, res, next) => {
    if (!Auth.check(req, 'usuarios:write')) {
        return next(403);
    }
    const id = req.params.id;
    deleteFile(id).then((data) => {
        res.json(data);
    }).catch(next);
});

export const restriccionHudsRouter = router;
