import { asyncHandler } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { EventCore } from '@andes/event-bus/';
import { Auth } from '../../../auth/auth.class';
import { emitCasoConfirmado, updateField } from './controller/forms-epidemiologia.controller';
import { FormsEpidemiologia } from './forms-epidemiologia-schema';

class FormsEpidemiologiaResource extends ResourceBase {
    Model = FormsEpidemiologia;
    resourceModule = 'epidemiologia';
    resourceName = 'formEpidemiologia';
    routesEnable = ['get', 'search'];

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
            field: 'secciones.fields.organizacion.id',
            fn: MongoQuery.partialString
        },
        zonaSanitaria: {
            field: 'zonaSanitaria._id',
            fn: MongoQuery.equalMatch
        },
        clasificacion: {
            field: 'secciones.fields.clasificacion.id',
            fn: MongoQuery.equalMatch
        },
        tipoConfirmacion: {
            field: 'secciones.fields.segundaclasificacion.id',
            fn: MongoQuery.equalMatch
        },
        clasificacionFinal: {
            field: 'secciones.fields.clasificacionfinal',
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
        documento: {
            field: 'paciente.documento',
            fn: MongoQuery.equalMatch
        },
        confirmacionFinal: {
            field: 'secciones.fields.clasificacionfinal',
            fn: MongoQuery.equalMatch
        }
    };

    eventBus = EventCore;
}

export const FormEpidemiologiaCtr = new FormsEpidemiologiaResource();
export const FormEpidemiologiaRouter = FormEpidemiologiaCtr.makeRoutes();


const post = async (req, res) => {
    const ficha = await FormEpidemiologiaCtr.create(req.body, req);
    await emitCasoConfirmado(ficha, Auth.getProfesional(req));
    res.json(ficha);
};

const patch = async (req, res) => {
    const id = req.params.id;
    const dto = req.body;
    const ficha = await FormEpidemiologiaCtr.update(id, dto, req);
    await emitCasoConfirmado(ficha, Auth.getProfesional(req));
    res.json(ficha);
};

const patchField = async (req, res) => {
    const dto = req.body;
    const id = req.params.id;
    let ficha = await updateField(id, dto);
    Auth.audit(ficha, req);
    ficha = await FormEpidemiologiaCtr.update(id, ficha, req);
    await emitCasoConfirmado(ficha, Auth.getProfesional(req));
    return res.json(ficha);
};

FormEpidemiologiaRouter.get('/types', Auth.authenticate(), async (req, res, next) => {
    try {
        const types: any = await FormsEpidemiologia.find({}, { type: 1 });
        return res.json(types);
    } catch (err) {
        return next(err);
    }
});

FormEpidemiologiaRouter.post('/formEpidemiologia', Auth.authenticate(), asyncHandler(post));
FormEpidemiologiaRouter.patch('/formEpidemiologia/:id?', Auth.authenticate(), asyncHandler(patch));
FormEpidemiologiaRouter.patch('/formEpidemiologia/:id/secciones/fields', Auth.authenticate(), asyncHandler(patchField));
