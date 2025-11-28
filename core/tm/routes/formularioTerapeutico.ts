import * as express from 'express';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from './../../../auth/auth.class';
import { FormularioTerapeutico } from '../schemas/formularioTerapeutico';

const router = express.Router();

class FormularioTerapeuticoResource extends ResourceBase {
    Model = FormularioTerapeutico;
    resourceName = 'formularioTerapeutico';
    keyId = '_id';
    searchFields = {
        sistema: MongoQuery.partialString,
        funcion: MongoQuery.partialString,
        grupoFarmacologico: MongoQuery.partialString,
        nivelComplejidad: MongoQuery.partialString,
        especialidad: MongoQuery.partialString,
        carroEmergencia: MongoQuery.partialString,
        medicamento: MongoQuery.partialString,
        principioActivo: MongoQuery.partialString,
        via: MongoQuery.partialString,
        formaFarmaceutica: MongoQuery.partialString,
        snomed: MongoQuery.partialString
    };
    middlewares = [Auth.authenticate()];
}
export const FormularioTerapeuticoCtr = new FormularioTerapeuticoResource({});
export const FormularioTerapeuticoRouter = FormularioTerapeuticoCtr.makeRoutes();
