import { Paciente } from '../paciente/paciente.schema';
import { renaper, sisa, renaperToAndes, sisaToAndes } from '@andes/fuentes-autenticas';
import { RenaperConfig } from './validacion.interfaces';
import { renaper as renaConfig } from '../../../config.private';

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
    const pacientes = await Paciente.find({ documento, sexo });
    if (pacientes && pacientes.length > 0) {
        const paciente = pacientes[0];
        return paciente;
    }
    const renaperConfig: RenaperConfig = {
        usuario: renaConfig.Usuario,
        password: renaConfig.password,
        url: renaConfig.url,
        server: renaConfig.serv
    };
    const ciudadanoRenaper = await renaper({ documento, sexo }, renaperConfig, renaperToAndes);
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
