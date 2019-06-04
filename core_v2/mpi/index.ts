import { Router } from 'express';
import { Routing as RoutingPaciente } from './pacientes';
import { Routing as RoutingValidacion } from './validacion';

const router = Router();
router.use(RoutingPaciente);
router.use(RoutingValidacion);

export const Routing = router;
