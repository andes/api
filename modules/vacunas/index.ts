import { Router } from 'express';
import { nomivacCategoriaRouter } from './nomivacCategoria.route';
import { nomivacCondicionRouter } from './nomivacCondicion.route';
import { nomivacDosisRouter } from './nomivacDosis.route';
import { nomivacEsquemaRouter } from './nomivacEsquema.route';
import { nomivacLaboratorioRouter } from './nomivacLaboratorio.route';
import { nomivacVacunaRouter } from './nomivacVacuna.route';

export const Routes = [
    nomivacCondicionRouter,
    nomivacVacunaRouter,
    nomivacCategoriaRouter,
    nomivacLaboratorioRouter,
    nomivacEsquemaRouter,
    nomivacDosisRouter
];
