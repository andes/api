import { pacienteSumar as getPacienteSumar } from './sumar';
import { getPaciente as getPacientePrepagas } from './prepagas';
import { pacientePuco as getPacientePuco } from './puco';

export async function getObraSocial(paciente) {
    if (!paciente.documento) { return []; }

    let financiador;
    let prepaga = await getPacientePrepagas(paciente.documento, paciente.sexo);
    if (prepaga) {
        return [prepaga];
    } else {
        let arrayOSPuco: any = await getPacienteSumar(paciente.documento);
        if (arrayOSPuco.length > 0) {
            return arrayOSPuco;
        } else {
            let arrayOSSumar = await getPacientePuco(paciente.documento);
            if (arrayOSSumar.length > 0) {
                return arrayOSSumar;
            } else {
                return [];
            }
        }
    }
}
