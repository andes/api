import { ResourceBase } from '@andes/core';
import { PersonalSalud } from './personal-salud.schema';
import { MongoQuery } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Request, Response, asyncHandler } from '@andes/api-tool';
import { Profesional } from '../../core/tm/schemas/profesional';

class PersonalSaludResource extends ResourceBase {
    Model = PersonalSalud;
    resourceName = 'personalSalud';
    // middlewares = [Auth.authenticate()];
    // routesAuthorization = {
    //     get: Auth.authorize('')
    // };
    routesEnable = ['get'];
    searchFileds = {
        documento: MongoQuery.partialString,
        nombre: MongoQuery.partialString,
        apellido: MongoQuery.partialString,
        search: ['documento', 'nombre', 'apellido']
    };
}

export const PersonalSaludCtr = new PersonalSaludResource({});
export const PersonalSaludRouter = PersonalSaludCtr.makeRoutes();

/**
 * @api {get} /modules/personalSalud - Búsqueda por documento, apellido, nombre
 * @apiName getPersonalSalud
 * @apiGroup personalSalud
 *
 * @apiSuccess {Array} Listado de personal de salud.
 */

export const get = async (req: Request, res: Response, next) => {
    const options = req.apiOptions();
    const conditions = req.query;
    try {
        let respuesta = await Profesional.find(conditions);
        if (!respuesta.length) {
            respuesta = await PersonalSaludCtr.search(conditions, options, req);
        }
        res.json(respuesta);
    } catch (err) {
        return next(err);
    }
};

PersonalSaludRouter.get('/personalSalud', /*Auth.authorize(''),*/ asyncHandler(get));
