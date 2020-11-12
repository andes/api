import { pacientePuco } from '../controller/puco';
import { getPacienteSumar } from '../controller/sumar';
import { IObraSocial, ObraSocial } from '../schemas/obraSocial';

/*Lo cambiamos porque las prepagas no se consultan de la tabla */
export async function getObraSocial(paciente) {
    if (!paciente.documento) { return []; }

    let arrayOSPuco: any = await pacientePuco(paciente.documento);
    if (arrayOSPuco.length > 0) {
        return arrayOSPuco;
    } else {
        let arrayOSSumar = await getPacienteSumar(paciente.documento);
        if (arrayOSSumar.length > 0) {
            return [{ codigoPuco: null, nombre: 'SUMAR', financiador: 'SUMAR' }];
        } else {
            return [];
        }
    }
}

export async function createObraSocial(dataOS: IObraSocial = null) {
    if (dataOS) {
        const newOS = new ObraSocial(dataOS);
        try {
            await newOS.save();
            return newOS;
        } catch (error) {
            return error;
        }
    }
}
