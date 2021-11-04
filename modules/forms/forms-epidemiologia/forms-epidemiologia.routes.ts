import { asyncHandler } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { updateField } from './controller/forms-epidemiologia.controller';
import { FormsEpidemiologia } from './forms-epidemiologia-schema';
import { SECCION_CLASIFICACION } from './constantes';
import { altaEventoLAMP } from '../../../modules/sisa/controller/sisa.controller';

class FormsEpidemiologiaResource extends ResourceBase {
    Model = FormsEpidemiologia;
    defaultParams = {
        active: true
    };
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
            fn: (value) => (value ? MongoQuery.equalMatch(value) : { $exists: false })
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
        active: (b) => b
    };
}

export const FormEpidemiologiaCtr = new FormsEpidemiologiaResource();
export const FormEpidemiologiaRouter = FormEpidemiologiaCtr.makeRoutes();

export const patchField = async (req, res) => {
    const body = req.body;
    const id = req.params.id;
    const { seccion, fields } = body;
    const ficha = await updateField(id, seccion, fields);

    Auth.audit(ficha, req);
    const response = await FormEpidemiologiaCtr.update(id, ficha, req);
    const isSeccionClasificacion = seccion === SECCION_CLASIFICACION;
    const isLAMPConfirmado = fields.find(f => f.lamp)?.lamp.id === 'confirmado';


    if (isSeccionClasificacion && isLAMPConfirmado) {
        altaEventoLAMP(ficha);
    }

    return res.json(response);
};


FormEpidemiologiaRouter.get('/types', Auth.authenticate(), async (req, res, next) => {
    try {
        const types: any = await FormsEpidemiologia.find({}, { type: 1 });
        return res.json(types);
    } catch (err) {
        return next(err);
    }
});

FormEpidemiologiaRouter.patch('/formEpidemiologia/:id/secciones/fields', Auth.authenticate(), asyncHandler(patchField));
