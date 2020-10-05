import { Paciente } from '../paciente/paciente.schema';
import { renaper, sisa, renaperToAndes, sisaToAndes } from '@andes/fuentes-autenticas';
import { RenaperConfig } from './validacion.interfaces';
import { renaper as renaConfig } from '../../../config.private';
import { sisa as sisaConfig } from '../../../config.private';
const sharp = require('sharp');

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
    /*const pacientes = await Paciente.find({ documento, sexo });
    if (pacientes && pacientes.length > 0) {
        const paciente = pacientes[0];
        return paciente;
    }*/
    const renaperConfig: RenaperConfig = {
        usuario: renaConfig.Usuario,
        password: renaConfig.password,
        url: renaConfig.url,
        server: renaConfig.serv
    };
    let ciudadanoRenaper = await renaper({ documento, sexo }, renaperConfig, renaperToAndes);
    if (ciudadanoRenaper) {
        // Valida el tamaño de la foto
        ciudadanoRenaper.foto = await validarTamañoFoto(ciudadanoRenaper.foto);
        ciudadanoRenaper.estado = 'validado';
        if (ciudadanoRenaper.direccion.length) {
            // Completamos campos correspondientes a dirección legal
            let ubicacionRena = ciudadanoRenaper.direccion[0].ubicacion;
            const ubicacionMatched = await ciudadanoRenaper.matchUbicacion(ubicacionRena.provincia.nombre, ubicacionRena.localidad.nombre);
            ubicacionRena = {
                pais: (ubicacionMatched.provincia) ? ubicacionMatched.provincia.pais : null,
                provincia: (ubicacionMatched.provincia) ? ubicacionMatched.provincia : null,
                localidad: (ubicacionMatched.localidad) ? ubicacionMatched.localidad : null,
                barrio: null,
            };
            ciudadanoRenaper.direccion[1] = ciudadanoRenaper.direccion[0];
            ciudadanoRenaper.direccion[1].ubicacion = ubicacionRena;
            ciudadanoRenaper.direccion[1].geoReferencia = null;
            ciudadanoRenaper.validateAt = new Date();
        }
        if (identidadSinAcentos(ciudadanoRenaper)) {
            return ciudadanoRenaper;
        }
    }
    const ciudadanoSisa = await sisa({ documento, sexo }, sisaConfig, sisaToAndes);
    if (ciudadanoSisa) {
        if (ciudadanoRenaper) {
            ciudadanoSisa.foto = ciudadanoRenaper.foto;
            ciudadanoSisa.direccion = ciudadanoRenaper.direccion;
            ciudadanoSisa.validateAt = new Date();
        }
        return ciudadanoSisa;
    }
    return null;

}


async function validarTamañoFoto(foto) {
    const buffer = Buffer.from(foto.substring(foto.indexOf(',') + 1));
    if (buffer.length > 50000) {
        const fotoNueva = await resizeFoto(foto);
        return fotoNueva;
    } else {
        return foto;
    }
}

async function resizeFoto(foto) {
    const base64Image = foto;

    let parts = base64Image.split(';');
    let mimType = parts[0].split(':')[1];
    let imageData = parts[1].split(',')[1];

    let img = new Buffer(imageData, 'base64');
    const semiTransparentRedPng = await sharp(img)
        .resize(500, 500)
        .toBuffer();

    let resizedImageData = semiTransparentRedPng.toString('base64');
    let resizedBase64 = `data:${mimType};base64,${resizedImageData}`;
    return resizedBase64;
}
