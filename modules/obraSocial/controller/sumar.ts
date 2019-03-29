import { sumar } from '../schemas/sumar';

export async function pacienteSumar(documento) {
    let rta: any = await sumar.findOne({ afidni: documento, activo: 'S ' }).exec();
    const resultOS = [];
    if (rta) {
        resultOS[0] = { codigoPuco: null, nombre: null, financiador: 'SUMAR' };
    }
    return resultOS;
}
