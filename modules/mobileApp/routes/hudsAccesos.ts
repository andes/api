import * as express from 'express';
import { asyncHandler } from '@andes/api-tool';
import { HudsAccesosCtr } from '../../../modules/huds/hudsAccesos.controller';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.get('/hudsAccesos', Auth.authenticate(), asyncHandler(async (req: any, res) => {
    res.json(await HudsAccesosCtr.search(req.query));
}));

export = router;
