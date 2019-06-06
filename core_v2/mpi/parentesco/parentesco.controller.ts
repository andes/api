
import { Types } from 'mongoose';
import { Parentesco } from './parentesco.schema';
import { parseStr } from '../../../shared/queryBuilderMongo';

/**
 * Busca un parentezco por ID
 */

export async function findById(id: string | String | Types.ObjectId, options = null) {
    options = options || {};
    const { fields } = options;

    const queryFind = Parentesco.findById(id);
    if (fields) {
        queryFind.select(fields);
    }
    return await queryFind;
}

/**
 * Devuelve un listado de parentezco
 */

export async function find(condicion, options?: any) {
    options = options || {};
    const { fields, skip, limit } = options;
    const opciones = {};

    if (condicion.nombre) {
        opciones['nombre'] = parseStr(condicion.nombre);
    }
    if (condicion.opuesto) {
        opciones['opuesto'] = parseStr(condicion.opuesto);
    }

    let query = Parentesco.find(opciones);

    if (fields) {
        query.select(fields);
    }
    if (limit) {
        query.limit(limit);
    }
    if (skip) {
        query.skip(skip);
    }

    return await query;
}

export const ParentescoCtr = {
    findById,
    find
};
