import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { FormsEpidemiologia } from './forms-epidemiologia-schema';

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
        },
        localidad: {
            field: 'secciones.fields.localidadresidencia.id',
            fn: MongoQuery.partialString
        },
        organizacion: {
            field: 'secciones.fields.organizacion',
            fn: MongoQuery.partialString
        },
        zonaSanitaria: {
            field: 'zonaSanitaria._id',
            fn: MongoQuery.equalMatch
        },
        identificadorPcr: {
            field: 'secciones.fields.identificadorpcr',
            fn: (value) => {
                return {
                    $regex: value
                };
            }
        },
        codigoSisa: {
            field: 'secciones.fields.codigoSisa',
            fn: (value) => (value ? { $type: 'number' } : { $not: { $type: 'number' } })
        },
        estado: {
            field: 'secciones.fields.seguimiento.ultimoEstado.key',
            fn: (value) => (value !== 'activo' ? { $eq: value } : { $not: { $in: ['alta', 'fallecido'] } })
        },
        fechaEstadoActual: MongoQuery.matchDate.withField('score.fecha'),
        documento: {
            field: 'paciente.documento',
            fn: MongoQuery.equalMatch
        },
        confirmacionFinal: {
            field: 'secciones.fields.clasificacionfinal',
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
