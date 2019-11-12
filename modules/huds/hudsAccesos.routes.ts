import * as express from 'express';
import { Auth } from '../../auth/auth.class';
import { asyncHandler } from '@andes/api-tool';
import { logAcceso } from './hudsAccesos';
import { HudsAccesosCtr } from './hudsAccesos.controller';
import { search } from './../../core/tm/controller/profesional';


const router = express.Router();

router.use(Auth.authenticate());
router.get('/huds-accesos', asyncHandler(async (req: any, res) => {
    const result = await HudsAccesosCtr.search(req.query);
    res.json(result);
}));

router.post('/huds-accesos/huds-token', asyncHandler(async (req: any, res) => {
    // Persiste los datos de accesos y genera el token para acceder a la HUDS del paciente
    const organizacionId = Auth.getOrganization(req);
    // Busca la matricula del profesional
    const idProfesional = (req as any).user.profesional ? (req as any).user.profesional.id : null;
    let matricula = null;
    if (idProfesional) {
        const datosProfesional: any  = await search({id: idProfesional}, { matricula: 1});
        matricula = (datosProfesional.length && datosProfesional[0].matricula && datosProfesional[0].matricula.length) ? datosProfesional[0].matricula[0] : null;
    }
    logAcceso(req, req.body.paciente.id, matricula, req.body.motivo, req.body.idTurno, req.body.idPrestacion);
    return res.json({ token: Auth.generateHudsToken(req.body.usuario, organizacionId, req.body.paciente) });
}));

router.get('/huds-accesos/checkToken', Auth.authenticate(), (req: any, res, next) => {
    let resp = false;
    if (req.query.token && req.query.idPaciente) {
        let tokenSettings = Auth.decode(req.query.token);
        if (tokenSettings && String(tokenSettings.paciente) === String(req.query.idPaciente)) {
            resp = true;
        }
    }
    return res.json(resp);
});

export const HudsAccesoRouter = router;
