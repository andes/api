import { MongoQuery, ResourceBase } from '@andes/core';
import { FormsEpidemiologia } from './forms-epidemiologia-schema';
import { Auth } from '../../../auth/auth.class';

class FormsEpidemiologiaResource extends ResourceBase {
    Model = FormsEpidemiologia;
    resourceName = 'formEpidemiologia';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        type: {
            field: 'type.name',
            fn: MongoQuery.partialString
        },
        fechaCondicion: MongoQuery.matchDate.withField('createdAt'),
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        }
    };
}

export const FormEpidemiologiaCtr = new FormsEpidemiologiaResource();
export const FormEpidemiologiaRouter = FormEpidemiologiaCtr.makeRoutes();

FormEpidemiologiaRouter.get('/types', Auth.authenticate(), async (req, res, next) => {
    try {
        const types: any = await FormsEpidemiologia.find({}, { type: 1 });
        return res.json(types);
    } catch (err) {
        return next(err);
    }
});

