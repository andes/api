import { InscripcionVacunasRouter } from './inscripcion-vacunas.routes';
import { nomivacCategoriaRouter } from './nomivacCategoria.route';
import { nomivacCondicionRouter } from './nomivacCondicion.route';
import { nomivacDosisRouter } from './nomivacDosis.route';
import { nomivacEsquemaRouter } from './nomivacEsquema.route';
import { nomivacLaboratorioRouter } from './nomivacLaboratorio.route';
import { nomivacLoteRouter } from './nomivacLote.route';
import { nomivacVacunaRouter } from './nomivacVacuna.route';
import { VacunasRouter } from './routes/vacunas';
import { VacunasPacientesRouter } from './routes/vacunas-pacientes.routes';
require('./controller/inscripcion-vacunas.events');
require('./controller/vacunas.events');

export const Routes = [
    nomivacCondicionRouter,
    nomivacVacunaRouter,
    nomivacCategoriaRouter,
    nomivacLaboratorioRouter,
    nomivacEsquemaRouter,
    nomivacDosisRouter,
    nomivacLoteRouter,
    InscripcionVacunasRouter,
    VacunasRouter,
    VacunasPacientesRouter
];
