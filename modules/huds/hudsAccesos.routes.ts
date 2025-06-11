import * as express from 'express';
import { Auth } from '../../auth/auth.class';
import { asyncHandler } from '@andes/api-tool';
import { logAcceso } from './hudsAccesos';
import { HudsAccesosCtr } from './hudsAccesos.controller';
import { search, searchMatriculaVigente } from './../../core/tm/controller/profesional';


const router = express.Router();

router.use(Auth.authenticate());
router.get('/accesos', asyncHandler(async (req: any, res) => {
    const result = await HudsAccesosCtr.search(req.query);
    res.json(result);
}));
router.get('/accesos/timeLeft', asyncHandler(async (req: any, res) => {
    const result = await Auth.getTokenTimeLeft(req.query.token);
    res.json(result);
}));


router.post('/accesos/token', asyncHandler(async (req: any, res) => {
    // Persiste los datos de accesos y genera el token para acceder a la HUDS del paciente
    const organizacionId = Auth.getOrganization(req);
    // Busca la matricula del profesional
    const profesional = Auth.getProfesional(req);
    const idProfesional = profesional ? profesional.id : null;
    let matricula = null;
    if (idProfesional) {
        const datosProfesional: any = await search({ id: idProfesional }, { matricula: 1 });
        matricula = await searchMatriculaVigente(idProfesional);
    }
    logAcceso(req, req.body.paciente.id, matricula, req.body.motivo, req.body.idTurno, req.body.idPrestacion, req.body.detalleMotivo);
    return res.json({ token: Auth.generateHudsToken(req.body.usuario, organizacionId, req.body.paciente) });
}));


export const HudsAccesoRouter = router;
