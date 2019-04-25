import * as pucoController from '../controller/puco';
import * as sumarController from '../controller/sumar';
/*Lo cambiamos porque las prepagas no se consultan de la tabla */
export async function getObraSocial(paciente) {
    if (!paciente.documento) { return []; }

    let arrayOSPuco: any = await pucoController.pacientePuco(paciente.documento);
    if (arrayOSPuco.length > 0) {
        return arrayOSPuco;
    } else {
        let arrayOSSumar = await sumarController.pacienteSumar(paciente.documento);
        if (arrayOSSumar.length > 0) {
            return arrayOSSumar;
        } else {
            return [];
        }
    }
}
