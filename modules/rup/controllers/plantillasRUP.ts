import { PlantillasRUP } from '../schemas/plantillasRUP';
import { getConceptByExpression } from '../../../core/term/controller/snomedCtr';
import { Auth } from '../../../auth/auth.class';
import { Types } from 'mongoose';
const ObjectId = Types.ObjectId;

export async function create(data, req) {
    // [TODO] implementar permisos especiales para crear elementos Globales o no.
    const expression = data.expression;

    const conceptos = await getConceptByExpression(expression);
    data.conceptos = conceptos;

    const plantilla = new PlantillasRUP(data);
    Auth.audit(plantilla, req);
    return await plantilla.save();
}

export async function update(id, data, req) {
    const plantilla = await PlantillasRUP.findById(id);
    if (plantilla) {

        const expression = data.expression;
        const conceptos = await getConceptByExpression(expression);
        data.conceptos = conceptos;

        plantilla.set(data);
        Auth.audit(plantilla, req);
        return await plantilla.save();
    }
    return null;
}

export async function remove(id) {
    const plantilla = await PlantillasRUP.findById(id);
    if (plantilla) {
        return await plantilla.remove();
    }
    return null;
}

export async function find(data, req) {
    const query: any = {};
    if (data.conceptId) {
        query['conceptos.conceptId'] = data.conceptId;
    }
    query['$and'] = [];
    if (data.organizacion) {
        query['$and'].push({
            $or: [
                { 'organizacion.id': ObjectId(data.organizacion) },
                { 'organizacion.id': { $exists: false } },
            ]
        });
    }

    if (data.profesional) {
        query['$and'].push({
            $or: [
                { 'profesional.id': ObjectId(data.profesional) },
                { 'profesional.id': { $exists: false } },
            ]
        });
    }
    return await PlantillasRUP.find(query);
}

export async function findById(id) {
    return await PlantillasRUP.findById(id);
}

