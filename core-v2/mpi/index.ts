
import { Router } from 'express';
import { PacienteRouter } from './paciente/paciente.routes';
import { Routing as RoutingValidacion } from './validacion';
require('./paciente/paciente.events');

const router = Router();
router.use(PacienteRouter);
router.use(RoutingValidacion);


export const RoutingMPI = router;

export * from './paciente';
