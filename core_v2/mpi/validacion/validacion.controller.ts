
import { findPaciente } from '../pacientes';
import { renaper, sisa, renaperToAndes, sisaToAndes } from '@andes/fuentes-autenticas';


function caracteresInvalidos(texto) {
    const regtest = /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ ']+/;
    return regtest.test(texto);
}

/**
 * Cheque que el nombre y apellido no tenga caracteres raros.
 */
function identidadSinAcentos(ciudadano) {
    return !caracteresInvalidos(ciudadano.nombre) && !caracteresInvalidos(ciudadano.apellido);
}

/**
 * Busca en fuentes auntenticas los datos de un ciudadano.
 */

export async function validar(documento: string, sexo: string) {
    const pacientes = await findPaciente({ documento, sexo });
    if (pacientes && pacientes.length > 0) {
        const paciente = pacientes[0];
        return paciente;
    }
    const ciudadanoRenaper = await renaper({ documento, sexo }, renaperToAndes);
    if (ciudadanoRenaper) {
        if (identidadSinAcentos(ciudadanoRenaper)) {
            return ciudadanoRenaper;
        }
    }

    const ciudadanoSisa = await sisa({ documento, sexo }, sisaToAndes);
    if (ciudadanoSisa) {
        if (ciudadanoRenaper) {
            ciudadanoSisa.foto = ciudadanoRenaper.foto;
        }
        return ciudadanoSisa;
    }
    return null;
}
