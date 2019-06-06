import { Router } from 'express';
import { Routing as RoutingPaciente } from './pacientes';
import { Routing as RoutingValidacion } from './validacion';
import { Routing as RoutingParentesco } from './parentesco';

const router = Router();
// router.use(RoutingPaciente);
// router.use(RoutingValidacion);
router.use(RoutingParentesco);

export const Routing = router;
