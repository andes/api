/**
 * Valores posibles de ámbito. Se usan en dos campos distintos (ver
 * docs/adr-ambito-origen-en-turnos-y-prestaciones.md):
 * - solicitud.ambitoOrigen: flujo donde nace la prestación. Lo define el sistema y decide
 *   listados, navegación y el campo `inicio`. El usuario no lo elige.
 * - procedencia (turno y solicitud): de dónde viene el paciente. Lo informa el usuario y es
 *   solo informativo.
 */
export const AMBITOS_ORIGEN = ['ambulatorio', 'internacion', 'guardia'];

export function procedenciaValida(procedencia: any): boolean {
    return typeof procedencia === 'string' && AMBITOS_ORIGEN.indexOf(procedencia) !== -1;
}
