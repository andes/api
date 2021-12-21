import { Router } from 'express';
import { PacienteRouter } from './paciente/paciente.routes';
import { PacientesEmpadronadosRouter } from './pacientes-empadronados/pacientes-empadronados.routes';
import { ParentescoRouter } from './parentesco/parentesco.routes';
import { Routing as RoutingValidacion } from './validacion';
require('./paciente/paciente.events');


const router = Router();
router.use(PacienteRouter);
router.use(ParentescoRouter);
router.use(RoutingValidacion);
router.use(PacientesEmpadronadosRouter);


export const RoutingMPI = router;

export * from './paciente';
