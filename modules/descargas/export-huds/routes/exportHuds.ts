import * as express from 'express';
import { Auth } from '../../../../auth/auth.class';
import { exportHuds } from '../../../../utils/roboSender/index';
import { ExportHudsModel } from '../../../../utils/exportHuds/exportHudsSchema';
import { getHUDSExportarModel, readFile } from '../../../../utils/exportHuds/hudsFiles';
import { Types } from 'mongoose';

const router = express.Router();
router.use(Auth.authenticate());

router.get('/exportHuds', async (req, res, next) => {
    const query = {
        'user.usuario.id': req.query.id,
        status: { $in: ['pending', 'completed'] }
    };
    const pending = await ExportHudsModel.find(query);
    res.json(pending);
});

router.post('/exportHuds', async (req: any, res, next) => {
    // Caso para exportar HUDS
    if (req.body.pacienteId) {
        const obj = await exportHuds(req.body, req.user);
        res.json(obj);
    }
});
router.post('/exportHuds/:id', async (req, res, next) => {
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

export = router;

