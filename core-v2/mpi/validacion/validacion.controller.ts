import { sisa, renaperToAndes, sisaToAndes, renaperv3 } from '@andes/fuentes-autenticas';
import { busInteroperabilidad } from '../../../config.private';
import { sisa as sisaConfig } from '../../../config.private';
import { matchUbicacion } from '../../../core/tm/controller/localidad';
import { IDireccion } from '../../../shared/interfaces';
import { Types } from 'mongoose';

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

    const ciudadanoRenaper = await renaperv3({ documento, sexo }, busInteroperabilidad, renaperToAndes);
    try {
        if (ciudadanoRenaper) {
            // Valida el tamaño de la foto
            ciudadanoRenaper.foto = ciudadanoRenaper.foto?.includes('image/jpg') ? await validarTamañoFoto(ciudadanoRenaper.foto) : null;
            ciudadanoRenaper.fotoId = ciudadanoRenaper.foto?.length > 0 ? new Types.ObjectId() : null;
            ciudadanoRenaper.estado = 'validado';
            ciudadanoRenaper.direccion[0] = await matchDireccion(ciudadanoRenaper);
            ciudadanoRenaper.direccion[1] = ciudadanoRenaper.direccion[0];
            ciudadanoRenaper.validateAt = new Date();
            if (identidadSinAcentos(ciudadanoRenaper)) {
                return ciudadanoRenaper;
            }
        }
        const ciudadanoSisa = await sisa({ documento, sexo }, sisaConfig, sisaToAndes);
        if (ciudadanoSisa) {
            ciudadanoSisa.direccion[0] = await matchDireccion(ciudadanoSisa);
            ciudadanoSisa.direccion[1] = ciudadanoSisa.direccion[0];
            ciudadanoSisa.validateAt = new Date();
            if (ciudadanoRenaper) {
                ciudadanoSisa.foto = ciudadanoRenaper.foto;
                ciudadanoSisa.direccion = ciudadanoRenaper.direccion;
                ciudadanoSisa.idTramite = ciudadanoRenaper.idTramite;
            }
            return ciudadanoSisa;
        } else {
            return ciudadanoRenaper;
        }
    } catch (error) {
        return null;
    }

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
    try {
        const base64Image = foto;

        const parts = base64Image.split(';');
        const mimType = parts[0].split(':')[1];
        const imageData = parts[1].split(',')[1];

        const img = Buffer.from(imageData, 'base64');
        const semiTransparentRedPng = await sharp(img)
            .resize(600, 600)
            .toBuffer();
        const resizedImageData = semiTransparentRedPng.toString('base64');
        const resizedBase64 = `data:${mimType};base64,${resizedImageData}`;
        return resizedBase64;
    } catch (error) {
        return null;
    }
}

async function matchDireccion(persona) {
    let direccion: IDireccion;
    if (persona.direccion.length > 0) {
        // Se realiza el matcheo de la dirección
        // Completamos campos correspondientes a dirección legal
        direccion = persona.direccion[0];
        let ubicacionRena = persona.direccion[0].ubicacion;
        const ubicacionMatched = await matchUbicacion(ubicacionRena.provincia.nombre, ubicacionRena.localidad.nombre);
        ubicacionRena = {
            pais: (ubicacionMatched.provincia) ? ubicacionMatched.provincia.pais : null,
            provincia: (ubicacionMatched.provincia) ? ubicacionMatched.provincia : null,
            localidad: (ubicacionMatched.localidad) ? ubicacionMatched.localidad : null,
            barrio: null,
        };
        direccion.ubicacion = ubicacionRena;
        direccion.geoReferencia = null;
    }
    return direccion;
}
