import numeracionMatriculas = require('../../../modules/matriculaciones/schemas/numeracionMatriculas');
import { Profesional } from '../../../core/tm/schemas/profesional';
import { Types } from 'mongoose';

export const query = { 'profesion.nombre': 'Especialidades' };

export async function ultimoPosgrado() {
    const data: any = await numeracionMatriculas.findOne(query);
    let ultimoNumero = 0;
    if (data) {
        ultimoNumero = data.proximoNumero;
    }
    return ultimoNumero;
}

export async function getNumeracionPorCodigoProfesion(codigoProfesion: string | number) {
    return numeracionMatriculas.findOne({ 'profesion.codigo': codigoProfesion });
}

export async function decrementarProximoNumeroPorProfesion(codigoProfesion: string | number) {
    return numeracionMatriculas.updateOne(
        {
            'profesion.codigo': codigoProfesion,
            proximoNumero: { $gt: 0 }
        },
        {
            $inc: { proximoNumero: -1 }
        }
    );
}

export async function existenNumerosPosterioresEnGrado(codigoProfesion: string | number, matriculaNumero: number, profesionalId: string, formacionId: string) {
    const matches = await Profesional.aggregate([
        { $unwind: '$formacionGrado' },
        {
            $addFields: {
                ultimaMatricula: { $arrayElemAt: ['$formacionGrado.matriculacion', -1] }
            }
        },
        {
            $match: {
                'formacionGrado.profesion.codigo': codigoProfesion,
                'ultimaMatricula.matriculaNumero': { $gt: matriculaNumero },
                $or: [
                    { _id: { $ne: new Types.ObjectId(profesionalId) } },
                    { 'formacionGrado._id': { $ne: new Types.ObjectId(formacionId) } }
                ]
            }
        },
        { $limit: 1 }
    ]);

    return matches.length > 0;
}
