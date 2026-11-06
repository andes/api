export const AMBITOS_ORIGEN = ['ambulatorio', 'internacion', 'guardia'];

export function ambitoOrigenValido(ambitoOrigen: any): boolean {
    return typeof ambitoOrigen === 'string' && AMBITOS_ORIGEN.indexOf(ambitoOrigen) !== -1;
}
