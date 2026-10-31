export const CONDICIONES_PACIENTE = ['ambulatorio', 'internado', 'guardia'];

export function condicionPacienteValida(condicionPaciente: any): boolean {
    return typeof condicionPaciente === 'string' && CONDICIONES_PACIENTE.indexOf(condicionPaciente) !== -1;
}
