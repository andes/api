import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { exportHuds } from '../../../utils/roboSender';
import { ExportHudsModel } from './exportHuds.schema';
import { getHUDSExportarModel, readFile } from './hudsFiles';
import { Types } from 'mongoose';

export const ExportHudsRouter = express.Router();
ExportHudsRouter.use(Auth.authenticate());

ExportHudsRouter.get('/export', async (req, res, next) => {
    const query: any = {
        'user.usuario.id': req.query.id,
        status: { $in: ['pending', 'completed'] }
    };
    if (req.query.fechaDesde && req.query.fechaHasta) {
        query.createdAt = { $gte: new Date(req.query.fechaDesde), $lte: new Date(req.query.fechaHasta) };
    } else {
        if (req.query.fechaDesde) {
            query.createdAt = { $gte: new Date(req.query.fechaDesde) };
        }
        if (req.query.fechaHasta) {
            query.createdAt = { $lte: new Date(req.query.fechaHasta) };
        }
    }
    const pending = await ExportHudsModel.find(query).sort({ createdAt: -1 });
    res.json(pending);
});

ExportHudsRouter.post('/export', async (req: any, res, next) => {
    if (req.body.pacienteId || req.body.prestaciones) {
        const obj = await exportHuds(req.body, req.user);
        return res.json(obj);
    }
    return next(400);

});
ExportHudsRouter.post('/export/:id', async (req, res, next) => {
    const hudsFiles = getHUDSExportarModel();
    try {
        const archivo = await readFile(req.params.id);
        res.contentType(archivo.file.contentType);
        archivo.stream.pipe(res);
    } catch (error) {
        return next(error);
    }
    // Borro despues de descargar
    const peticionExport: any = await ExportHudsModel.findById(req.body.idHuds);
    peticionExport.status = 'success';
    peticionExport.updatedAt = new Date();
    peticionExport.save();
    const idFile = Types.ObjectId(req.body.id);
    const file = await hudsFiles.findOne({ _id: idFile });
    hudsFiles.unlink(file._id, () => { });
});
