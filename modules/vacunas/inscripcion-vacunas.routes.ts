import { MongoQuery, ResourceBase } from '@andes/core';
import { Request, Response } from '@andes/api-tool';
import { Auth } from '../../auth/auth.class';
import { InscripcionVacuna } from './schemas/inscripcion-vacunas.schema';
import { EventCore } from '@andes/event-bus/';
import { validar } from '../../core-v2/mpi/validacion';
import { matching } from '../../core-v2/mpi/paciente/paciente.controller';
import { mpi } from '../../config';

class InscripcionVacunasResource extends ResourceBase {
    Model = InscripcionVacuna;
    resourceModule = 'vacunas';
    resourceName = 'inscripcion-vacunas';
    routesEnable = ['put'];
    middlewares = [Auth.authenticate()];
    searchFileds = {
        documento: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString,
        apellido: MongoQuery.partialString,
        sexo: MongoQuery.equalMatch
    };
    eventBus = EventCore;
}

export const InscripcionVacunasCtr = new InscripcionVacunasResource({});
export const InscripcionVacunasRouter = InscripcionVacunasCtr.makeRoutes();

InscripcionVacunasRouter.get('/inscripcion-vacunas/consultas', async (req: Request, res, next) => {
    try {
        const doc = req.query.documento;
        const sexo = req.query.sexo;
        if (doc && sexo) {
            const inscripto = await InscripcionVacunasCtr.findOne({
                documento: doc,
                sexo
            });
            return res.json(inscripto);
        }
        return next('Parámetros incorrectos');
    } catch (err) {
        return next(err);
    }
});

InscripcionVacunasRouter.get('/inscripcion-vacunas', Auth.authenticate(), async (req: Request, res, next) => {
    try {
        const options = req.apiOptions();
        const data = req.query;
        const inscriptos = await InscripcionVacunasCtr.search(data, options, req);
        return res.json(inscriptos);
    } catch (err) {
        return next(err);
    }
});

InscripcionVacunasRouter.post('/inscripcion-vacunas', async (req: Request, res, next) => {
    try {
        const documento = req.body.documento;
        const sexo = req.body.sexo;
        // Verifica si se encuentra inscripto previamente
        const inscripto = await InscripcionVacunasCtr.findOne({ documento, sexo });
        if (!inscripto) {
            req.body.validado = false;
            req.body.estado = 'pendiente';
            // Realiza la búsqueda en Renaper
            const inscriptoValidado = await validar(documento, sexo);
            if (inscriptoValidado) {
                const tramite = Number(req.body.nroTramite);
                // Verifica el número de trámite
                if (inscriptoValidado.idTramite && inscriptoValidado.idTramite !== tramite) {
                    return next('Número de Trámite inválido');
                }
                // Realiza el match
                const value = await matching(inscriptoValidado, req.body);
                if (value < mpi.cotaMatchMax) {
                    return next('Datos inválidos');
                }
                req.body.validado = true;
            }
            const inscripcion = await InscripcionVacunasCtr.create(req.body, req);
            EventCore.emitAsync('vacunas:inscripcion-vacunas:create', inscripcion, inscriptoValidado, req);
            return res.json(inscripcion);
        } else {
            return next('Se encuentra inscripto');
        }

    } catch (err) {
        return next(err);
    }

});
