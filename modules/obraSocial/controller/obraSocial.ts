import { pacientePuco } from '../controller/puco';
import { pacienteSumar } from '../controller/sumar';
/*Lo cambiamos porque las prepagas no se consultan de la tabla */
export async function getObraSocial(paciente) {
    if (!paciente.documento) { return []; }

    let arrayOSPuco: any = await pacientePuco(paciente.documento);
    if (arrayOSPuco.length > 0) {
        return arrayOSPuco;
    } else {
        let arrayOSSumar = await pacienteSumar(paciente.documento);
        if (arrayOSSumar.length > 0) {
            return arrayOSSumar;
        } else {
            return [];
        }
    }
}
