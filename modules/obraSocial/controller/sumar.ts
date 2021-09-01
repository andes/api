import { sumar } from '../schemas/sumar';

export async function getPacienteSumar(documento) {
    const rta: any = await sumar.findOne({ afidni: documento, activo: 'S ' }).exec();
    if (rta) {
        return [rta];
    } else {
        return [];
    }
}
