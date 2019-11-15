import * as express from 'express';
import * as ultimaCarpeta from '../schemas/ultimaCarpeta';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.get('/ultimaCarpeta', async (req: any, res, next) => {
    try {
        const idOrganizacion = new mongoose.Types.ObjectId(req.user.organizacion.id);
        const result: any = await ultimaCarpeta.findOne({ idEfector: idOrganizacion });
        const ultima = (result && result.ultimaCarpeta) ? result.ultimaCarpeta + 1 : 0;
        res.json(ultima);
    } catch (error) {
        return next(error);
    }
});

router.post('/incrementarCuenta', async (req: any, res, next) => {
    try {
        const organizacion: any = Auth.getOrganization(req);
        const idOrganizacion = new mongoose.Types.ObjectId(organizacion.id);
        const result: any = await ultimaCarpeta.findOne({ idEfector: idOrganizacion });
        const update: any = {
            ultimaCarpeta: (result && result.ultimaCarpeta) ? result.ultimaCarpeta + 1 : 0
        };
        const updateCarpeta = await ultimaCarpeta.update({ idEfector: idOrganizacion }, { $set: update }, { new: true });
        res.json(updateCarpeta);
    } catch (error) {
        return next(error);
    }

});

export = router;
