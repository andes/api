
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { SnomedCtr } from '../term/controller/snomed.controller';
import { ServicioIntermedio } from './schemas/servicio-intermedio.schema';

/**
 * TM servicios-intermedio: opcionalmente `procedimientosEcl` resuelve `procedimientos` vía Snowstorm.
 *
 * PATCH: si el body incluye `procedimientosEcl` vacío o null, se elimina el campo guardado y
 * no se modifican los `procedimientos` ya persistidos (opción A del plan).
 */
class ServicioIntermedioResource extends ResourceBase {
    Model = ServicioIntermedio;
    resourceName = 'servicios-intermedio';
    searchFileds = {
        search: ['nombre'],
        nombre: MongoQuery.equalMatch,
        ids: MongoQuery.inArray.withField('_id')
    };
    middlewares = [Auth.authenticate()];

    async getConceptosFromIds(ids: string[]) {
        const serviciosObj = await ServicionIntermedioCtr.search({ ids });
        const conceptos = serviciosObj.reduce((acc, current) => [...acc, ...(current.conceptosTurneables || [])], []);
        return conceptos;
    }

    public async populate(dto: any) {
        const data = { ...(dto || {}) };
        if (typeof data.procedimientosEcl === 'string') {
            const trimmed = data.procedimientosEcl.trim();
            if (trimmed.length > 0) {
                data.procedimientosEcl = trimmed;
                data.procedimientos = await SnomedCtr.getConceptByExpression(trimmed, null, 'inferred');
            } else {
                delete data.procedimientosEcl;
            }
        } else if (data.procedimientosEcl === null) {
            delete data.procedimientosEcl;
        }
        return data;
    }
}
export const ServicionIntermedioCtr = new ServicioIntermedioResource();
export const ServicionIntermedioRouter = ServicionIntermedioCtr.makeRoutes();
