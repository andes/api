import { Types } from 'mongoose';
import { Paciente, replaceChars } from './paciente.schema';
import * as moment from 'moment';
import * as intoStream from 'into-stream';
import { Matching } from '@andes/match';
import { IPacienteDoc, IPaciente } from './paciente.interface';
import { isSelected } from '@andes/core';
import { getObraSocial } from '../../../modules/obraSocial/controller/obraSocial';
import { PacienteCtr } from './paciente.routes';
import { geoReferenciar, getBarrio } from '@andes/georeference';
import { FileMetadata, AndesDrive } from '@andes/drive';
import * as Barrio from '../../../core/tm/schemas/barrio';
import * as configPrivate from '../../../config.private';
import * as config from '../../../config';
import { IContacto } from '../../../shared/interfaces/contacto.interface';
import { ParentescoCtr } from '../parentesco/parentesco.routes';


/**
 * Crea un objeto paciente
 */

export function make(body: IPaciente) {
    const paciente = new Paciente();
    paciente.set(body);
    return paciente;
}

/**
 * Modifica los campos de un paciente.
 * @param {IPacienteDoc} paciente paciente a modifciar
 * @param {object} body Datos a modificar del paciente
 */

export function set(paciente: IPacienteDoc, body: any) {
    if (paciente.estado === 'validado') {
        delete body['documento'];
        delete body['estado'];
    }
    paciente.set(body);
    if (paciente.foto && !paciente.fotoId) {
        (paciente as any).fotoId = new Types.ObjectId();
    }
    return paciente;
}

/**
 * Busca un paciente por ID. Tanto en ANDES y MPI.
 * @param {string} id ID del paciente a buscar.
 * @param {object} options
 * @param {string} options.fields Listado de campos para projectar
 * @returns {IPacienteDoc}
 */

export async function findById(id: string | String | Types.ObjectId, options = null): Promise<IPacienteDoc> {
    options = options || {};
    const { fields } = options;

    const queryFind = Paciente.findById(id);
    if (fields) {
        queryFind.select(fields);
    }
    const paciente = await queryFind;
    if (paciente) {
        if (isSelected(fields, 'financiador')) {
            paciente.financiador = await getObraSocial(paciente);
        }
        return paciente;
    }
    return null;
}


/**
 * Busca paciente similares a partir de su documento
 * Devuelve una lista de pacientes ordenada por score de forma descendente
 *
 * @param {object} query Condiciones a buscar
 *
 * [TODO] Definir el tipado de esta funcion
 */

export async function suggest(query: any) {
    if (query && query.documento) {
        const documento = query.documento.toString();
        // @ts-ignore: fuzzySearch
        const pacientes = await Paciente.fuzzySearch({ query: documento, minSize: 3 }, { activo: { $eq: true } }).limit(30);
        const suggested = [];
        pacientes.forEach((paciente) => {
            const value = matching(paciente, query);
            if (value > config.mpi.cotaMatchMin) {
                suggested.push({
                    id: paciente.id,
                    paciente,
                    _score: value
                });
            }
        });
        const sortScore = (a, b) => {
            return b._score - a._score;
        };
        return suggested.sort(sortScore);
    } else {
        return [];
    }
}


/**
 * Realiza un matching entre dos pacientes.
 * Devuelve un valor con el porcentaje de matcheo entre 0 y 1
 *
 * @param {IPaciente} pacienteA Datos del paciente
 * @param {IPaciente} pacienteB Datos del paciente
 * @returns Devuelve un número que indica el porcentaje de matcheo entre los dos pacientes
 *
 */

export function matching(pacienteA: IPaciente | IPacienteDoc, pacienteB: IPaciente, weightsDefault?: any) {
    const personaA = {
        documento: pacienteA.documento ? pacienteA.documento.toString() : '',
        nombre: pacienteA.nombre ? pacienteA.nombre : '',
        apellido: pacienteA.apellido ? pacienteA.apellido : '',
        fechaNacimiento: pacienteA.fechaNacimiento ? moment(pacienteA.fechaNacimiento).format('YYYY-MM-DD') : '',
        sexo: pacienteA.sexo ? pacienteA.sexo : ''
    };

    const personaB = {
        documento: pacienteB.documento ? pacienteB.documento.toString() : '',
        nombre: pacienteB.nombre ? pacienteB.nombre : '',
        apellido: pacienteB.apellido ? pacienteB.apellido : '',
        fechaNacimiento: pacienteB.fechaNacimiento ? moment(pacienteB.fechaNacimiento).format('YYYY-MM-DD') : '',
        sexo: pacienteB.sexo ? pacienteB.sexo : ''
    };

    const match = new Matching();

    const valorMatching = match.matchPersonas(personaA, personaB, weightsDefault ? weightsDefault : config.mpi.weightsDefault, config.algoritmo);
    return valorMatching;

}

/**
 * Chequea si hay algun paciente con maching superior a la cota maxima de aceptacion.
 */

export function isMatchingAlto(sugeridos: any[]) {
    return sugeridos.some((paciente) => paciente._score > config.mpi.cotaMatchMax);
}

/**
 * Busca pacientes dada de una cadena de texto por documento, apellido, nombre, alias
 * o número de identificación
 *
 * @param {string} searchText Condiciones a buscar
 * @param {object} filter Condiciones a buscar
 * @param {object} options Condiciones a buscar
 */

export async function multimatch(searchText: string, filter: any, options?: any) {
    const ExpRegFilter = /([-_()\[\]{}+?*.$\^|¨`´~,:#<>¡!\\])/g;
    let words: any = searchText.replace(ExpRegFilter, '');
    words = replaceChars(words);
    words = words.trim().toLowerCase().split(' ');
    const andQuery = [];
    words.forEach(w => {
        andQuery.push({ tokens: RegExp(`^${w}`) });
    });
    andQuery.push(filter);
    const query = {
        $and: andQuery
    };
    const skip = parseInt(options.skip || 0, 10);
    const limit = parseInt(options.limit || 30, 10);
    const pacientes = await Paciente.find(query).skip(skip).limit(limit);
    return pacientes;
}

/**
 * Busca pacientes dado el documento, nombre, apellido, sexo y fecha de Nacimento
 *
 * @param {object} query Condiciones a buscar
 */

export async function findOrCreate(query: any, req) {
    const sugeridos = await suggest(query);
    if (sugeridos.length > 0 && isMatchingAlto(sugeridos)) {
        return sugeridos[0].paciente;
    }
    query.activo = true; // Todo paciente esta activo por defecto
    query.genero = query.genero || query.sexo;
    query.estado = query.estado || 'temporal';
    const paciente = make(query);
    const pacienteCreado = await PacienteCtr.create(paciente, req);
    return pacienteCreado;
}

/**
 * Vincula pacientes
 *
 * @param {string} op tipo de operación
 * @param {object} pacienteBase paciente que se vinculará con otros
 * @param {object} pacienteLinkeado paciente a linkear
 */

export async function linkPaciente(req, op, pacienteBase, pacienteLinkeado) {
    const dataLink = {
        entidad: 'ANDES',
        valor: pacienteLinkeado.id
    };
    if (op === 'link') {
        if (pacienteBase.identificadores) {
            pacienteBase.identificadores.push(dataLink);
        } else {
            pacienteBase.identificadores = [dataLink]; // Primer elemento del array
        }
        pacienteLinkeado.activo = false;
    }
    if (op === 'unlink') {
        if (pacienteBase.identificadores) {
            pacienteBase.identificadores = pacienteBase.identificadores.filter(x => x.valor !== dataLink.valor);
        }
        pacienteLinkeado.activo = true;
    }

    await PacienteCtr.update(pacienteBase.id, pacienteBase, req);
    await PacienteCtr.update(pacienteLinkeado.id, pacienteLinkeado, req);
}


export async function linkPacientesDuplicados(req, paciente) {
    // linkea los pacientes validados con los temporales con un alto porcentaje de match
    const resultado = await suggest(paciente);
    if (resultado.length > 0) {
        // Verifica los resultados y linkea los pacientes
        resultado.forEach(async pacienteLink => {
            if (pacienteLink._score > config.mpi.cotaMatchMax && paciente.id !== pacienteLink.id) {
                await linkPaciente(req, 'link', paciente, pacienteLink);
            }
        });
    }
}


/**
 * * Segun la entrada, retorna un Point con las coordenadas de geo referencia o null.
 * @param data debe contener direccion y localidad.
 */

export const updateGeoreferencia = async (paciente: IPacienteDoc) => {
    try {
        const direccion: any = paciente.direccion;
        // (valores de direccion fueron modificados): están completos?
        if (direccion[0].valor && direccion[0].ubicacion.localidad && direccion[0].ubicacion.provincia) {
            const dir = direccion[0].valor + ', ' + direccion[0].ubicacion.localidad.nombre + ', ' + direccion[0].ubicacion.provincia.nombre;
            const geoRef: any = await geoReferenciar(dir, configPrivate.geoKey);
            // georeferencia exitosa?
            if (geoRef && Object.keys(geoRef).length) {
                direccion[0].geoReferencia = [geoRef.lat, geoRef.lng];
                const nombreBarrio = await getBarrio(geoRef, configPrivate.geoNode.host, configPrivate.geoNode.auth.user, configPrivate.geoNode.auth.password);
                // consulta exitosa?
                if (nombreBarrio) {
                    const barrioPaciente = await Barrio.findOne().where('nombre').equals(RegExp('^.*' + nombreBarrio + '.*$', 'i'));
                    if (barrioPaciente) {
                        direccion[0].ubicacion.barrio = barrioPaciente;
                    }
                }
            } else {
                direccion[0].geoReferencia = null;
                direccion[0].ubicacion.barrio = null;
            }
        }
        if (direccion[0].geoReferencia) {
            paciente = set(paciente, direccion);
            PacienteCtr.update(paciente.id, paciente, configPrivate.userScheduler as any);
        }
    } catch (err) {
        return (err);
    }
};

/**
 * Verifica la existencia de una carpeta de paciente en el efector actual
 *
 * @param {object} req
 */
export async function checkCarpeta(req) {
    if (req.body && req.body.carpetaEfectores) {

        const indiceCarpeta = req.body.carpetaEfectores.findIndex(x => x.organizacion._id === req.user.organizacion.id);
        if (indiceCarpeta > -1) {
            const query = {
                carpetaEfectores: {
                    $elemMatch: {
                        nroCarpeta: req.body.carpetaEfectores[indiceCarpeta].nroCarpeta,
                        'organizacion._id': req.body.carpetaEfectores[indiceCarpeta].organizacion._id
                    }
                }
            };
            const unPaciente = await Paciente.find(query).exec();
            return (unPaciente?.length > 0);
        } else {
            return null;
        }
    } else {
        return null;
    }
}

/**
 * Guarda la foto de un paciente utilizando AndesDrive
 *
 * @param {object} query Condiciones a buscar
 */

export async function storePhoto(foto: String, fotoId: Types.ObjectId, req) {
    const parts = foto.split(';');
    const mimType = parts[0].split(':')[1];
    const fileData = parts[1].split(',')[1];
    const fileDataBuffer = Buffer.from(fileData, 'base64');
    const fileStream = intoStream(fileDataBuffer);
    const metadata: FileMetadata = {
        _id: fotoId,
        filename: `foto_${fotoId}.${mimType.split('/')[1]}`,
        contentType: mimType,
        origin: 'mpi'
    };
    const data: any = await AndesDrive.writeFile(fileStream, metadata, req);
    return data;
}


export async function extractFoto(paciente, req) {
    if (paciente.foto && paciente.fotoId) {
        await storePhoto(paciente.foto, paciente.fotoId, req);
        paciente.foto = null;
    }
}

export async function updateContacto(contactos, paciente, req) {
    if (contactos.length > 0) {
        const contactosPaciente = paciente.contacto || [];
        contactos.forEach((contacto) => {
            let contactoFound = null;
            if (paciente.contacto && paciente.contacto.length >= 0) {
                contactoFound = paciente.contacto.find(c => c && c.valor && (c.valor === contacto.valor));
            }
            if (!contactoFound) {
                const nuevoContacto: IContacto = {
                    activo: true,
                    tipo: contacto.tipo,
                    valor: contacto.valor,
                    ranking: 0,
                    ultimaActualizacion: new Date()
                };
                contactosPaciente.push(nuevoContacto);
            }
        });
        paciente.contacto = contactosPaciente;
        await PacienteCtr.update(paciente.id, paciente, req as any);
    }
}

export async function agregarHijo(progenitor, hijo, req) {

    // Familiar ya existe?
    progenitor.relaciones = progenitor.relaciones || [];
    const poseeFamiliar = progenitor.relaciones.find(rel => {
        return rel.referencia.toString() === hijo._id.toString();
    });

    if (!poseeFamiliar) {
        // agrego relacion al hijo
        const parentescoProgenitor = await ParentescoCtr.findOne({ nombre: '^progenitor' }, {}, req);
        const progenitorRelacion = {
            relacion: parentescoProgenitor,
            referencia: progenitor._id,
            nombre: progenitor.nombre,
            apellido: progenitor.apellido,
            documento: progenitor.documento ? progenitor.documento : null,
            numeroIdentificacion: progenitor.numeroIdentificacion ? progenitor.numeroIdentificacion : null,
            fotoId: progenitor.fotoId ? progenitor.fotoId : null,
            fechaFallecimiento: progenitor.fechaFallecimiento ? progenitor.fechaFallecimiento : null
        };

        hijo.relaciones = hijo.relaciones || [];
        hijo.relaciones.push(progenitorRelacion);

        await PacienteCtr.update(hijo.id, hijo, req);
        // agrego relacion al padre
        const parentescoHijo = await ParentescoCtr.findOne({ nombre: '^hijo' }, {}, req);
        const familiarRelacion = {
            relacion: parentescoHijo,
            referencia: hijo._id,
            nombre: hijo.nombre,
            apellido: hijo.apellido,
            documento: hijo.documento,
            numeroIdentificacion: hijo.numeroIdentificacion ? hijo.numeroIdentificacion : null,
            fotoId: hijo.fotoId ? hijo.fotoId : null,
            fechaFallecimiento: hijo.fechaFallecimiento ? hijo.fechaFallecimiento : null
        };

        progenitor.relaciones.push(familiarRelacion);

        const pacienteUpdated = await PacienteCtr.update(progenitor.id, progenitor, req);
        return pacienteUpdated;
    } else {
        return null;
    }
}

export async function getLocalidad(paciente) {
    if (paciente.direccion && paciente.direccion.length) {
        const unaDireccion = paciente.direccion[0];
        if (unaDireccion.ubicacion && unaDireccion.ubicacion.localidad) {
            return unaDireccion.ubicacion.localidad;
        }
    }
    return null;
}
