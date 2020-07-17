import * as config from '../../../config';
import * as moment from 'moment';
import { paciente } from '../schemas/paciente';
import { Matching } from '@andes/match';
import { Auth } from './../../../auth/auth.class';
import { EventCore } from '@andes/event-bus';
import * as agendaController from '../../../modules/turnos/controller/agenda';
import * as turnosController from '../../../modules/turnos/controller/turnosController';
import * as agenda from '../../../modules/turnos/schemas/agenda';
import { sisa, renaperToAndes, sisaToAndes } from '@andes/fuentes-autenticas';
import { sisa as sisaConfig } from '../../../config.private';
import { renaper } from '@andes/fuentes-autenticas';
import { RenaperConfig } from '../../../modules/fuentesAutenticas/interfaces';
import { renaper as renaConfig } from '../../../config.private';
const regtest = /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ ']+/;
import * as configPrivate from '../../../config.private';
import { geoReferenciar, getBarrio } from '@andes/georeference';
import * as Barrio from '../../tm/schemas/barrio';
import { log as andesLog } from '@andes/log';
import { logKeys } from '../../../config';
import * as mongoose from 'mongoose';
import * as localidadController from '../../tm/controller/localidad';

const sharp = require('sharp');

/**
 * Crea un paciente
 *
 * @param data Datos del paciente
 * @param req  request de express para poder auditar
 */
export async function createPaciente(data, req) {
    const newPatient = new paciente(data);
    if (req) {
        Auth.audit(newPatient, req);
    }
    try {
        await newPatient.save();
        andesLog(req, logKeys.mpiInsert.key, req.body._id, req.method + ' | ' + req.originalUrl, newPatient, null);

        // Código para emitir eventos
        EventCore.emitAsync('mpi:patient:create', newPatient);
        return newPatient;
    } catch (error) {
        andesLog(req, logKeys.mpiInsert.key, req.body._id, req.method + ' | ' + req.originalUrl, null, 'Error insertando paciente');
        return error;
    }
}


export async function updatePaciente(pacienteObj, data, req) {
    const pacienteOriginal = pacienteObj.toObject();
    for (const key in data) {
        pacienteObj[key] = data[key];
    }
    // Habilita auditoria y guarda
    if (req) {
        Auth.audit(pacienteObj, req);
    }
    try {
        await pacienteObj.save();
        andesLog(req, logKeys.mpiUpdate.key, req.body._id, req.method + ' | ' + req.originalUrl, pacienteObj, pacienteOriginal);

        EventCore.emitAsync('mpi:patient:update', pacienteObj);
        return pacienteObj;
    } catch (error) {
        andesLog(req, logKeys.mpiInsert.key, req.body._id, req.method + ' | ' + req.originalUrl, pacienteObj, 'create patient');
        return error;
    }
}
/**
 * Busca los turnos futuros asignados al paciente y actualiza los datos.
 *
 * @param {any} pacienteModified paciente modificado
 * @returns
 */
export async function updateTurnosPaciente(pacienteModified) {
    const req = {
        query: {
            estado: 'asignado',
            pacienteId: pacienteModified.id,
            horaInicio: moment(new Date()).startOf('day').toDate() as any
        }
    };
    const turnos: any = await turnosController.getTurno(req);
    if (turnos.length > 0) {
        turnos.forEach(element => {
            try {
                agendaController.updatePaciente(pacienteModified, element);
            } catch (error) {
                return error;
            }
        });
    }
}


/**
 * Busca un paciente en la colección paciente
 * devuelve los datos del paciente
 *
 * @export
 * @param {any} id
 * @returns
 */
export function buscarPaciente(id): Promise<{ db: String, paciente: any }> {
    return new Promise((resolve, reject) => {
        paciente.findById(id, (err, data) => {
            if (err) {
                reject(err);
            } else {
                if (data) {
                    const resultado = {
                        db: 'andes',
                        paciente: data
                    };
                    resolve(resultado);
                } else {
                    reject(null);
                }
            }
        });
    });
}
/**
 * Busca un paciente en Andes segun su documento, sexo y estado validado
 * devuelve los datos del paciente
 *
 * @export
 * @param {string} documento
 * @param {string} sexo
 * @returns
 */
export async function buscarPacByDocYSexo(documento, sexo) {
    const query = {
        documento,
        sexo,
        estado: 'validado'
    };
    const lista = await paciente.find(query);
    return lista;
}

/**
 * Busca un paciente en MPI y luego en andes con cierta condición.
 * @param condition
 */

export function buscarPacienteWithcondition(condition): Promise<{ db: String, paciente: any }> {
    return new Promise((resolve, reject) => {
        paciente.findOne(condition, (err2, dataMpi) => {
            if (err2) {
                reject(err2);
            } else if (dataMpi) {
                const resultado = {
                    db: 'andes',
                    paciente: dataMpi
                };
                resolve(resultado);
            } else {
                reject(null);
            }
        });
    });
}


/**
 * Matching de paciente
 *
 * @param data
 */
export async function matching(data) {
    let query;

    switch (data.type) {
        case 'simplequery':
            query = {
                documento: data.documento,
                apellido: data.apellido,
                nombre: data.nombre,
                sexo: data.sexo
            };

            break;
        case 'multimatch':
            {
                const words = data.cadenaInput.trim().toLowerCase().split(' ');
                let andQuery = [];
                words.forEach(w => {
                    andQuery.push({ tokens: RegExp(`^${w}`) });
                });
                andQuery.push({ activo: { $eq: true } });
                query = {
                    $and: andQuery
                };
            }
            break;
        case 'suggest':
            {
                // Sugiere pacientes que tengan la misma clave de blocking
                query = {
                    documento: data.documento,
                    apellido: data.apellido,
                    nombre: data.nombre,
                    sexo: data.sexo,
                    fechaNacimiento: data.fechaNacimiento
                };
            }
            break;
        case 'search':
            {
                query = {
                    $and: [data.filtros],
                    activo: 'true'
                };
            }
            break;
    }

    try {
        if (data.type === 'suggest') {
            // @ts-ignore: fuzzySearch
            const pacientes = await paciente.fuzzySearch({ query: query.documento.toString(), minSize: 3 }, { activo: { $eq: true } }).limit(30);
            const listaSugeridos = obtenerSugeridos(data, pacientes);

            const sortMatching = (a, b) => {
                return b.match - a.match;
            };

            return listaSugeridos.sort(sortMatching);

        } else {
            // multimatch, simplequery, search
            let skip = parseInt(data.skip || 0, 10);
            let limit = parseInt(data.limit || 30, 10);
            return await paciente.find(query).skip(skip).limit(limit);
        }

    } catch (err) {
        return [];
    }
}

function obtenerSugeridos(_paciente, pacientesSimilares) {
    const weights = _paciente.escaneado ? config.mpi.weightsScan : config.mpi.weightsDefault;
    const porcentajeMatchMax = config.mpi.cotaMatchMax;
    const porcentajeMatchMin = config.mpi.cotaMatchMin;
    const listaPacientesMax = [];
    const listaPacientesMin = [];

    pacientesSimilares.forEach((pac: any) => {
        const sugerido = pac;
        const pacienteDto = {
            documento: _paciente.documento ? _paciente.documento.toString() : '',
            nombre: _paciente.nombre ? _paciente.nombre : '',
            apellido: _paciente.apellido ? _paciente.apellido : '',
            fechaNacimiento: _paciente.fechaNacimiento ? moment(_paciente.fechaNacimiento).format('YYYY-MM-DD') : '',
            sexo: _paciente.sexo ? _paciente.sexo : ''
        };
        const sugeridoDto = {
            documento: sugerido.documento ? sugerido.documento.toString() : '',
            nombre: sugerido.nombre ? sugerido.nombre : '',
            apellido: sugerido.apellido ? sugerido.apellido : '',
            fechaNacimiento: sugerido.fechaNacimiento ? moment(sugerido.fechaNacimiento).format('YYYY-MM-DD') : '',
            sexo: sugerido.sexo ? sugerido.sexo : ''
        };
        let match = new Matching();
        let valorMatching = match.matchPersonas(sugeridoDto, pacienteDto, weights, config.algoritmo);

        sugerido['id'] = pac._id;
        if (valorMatching >= porcentajeMatchMax) {
            listaPacientesMax.push({
                id: sugerido.id,
                paciente: sugerido,
                match: valorMatching
            });
        } else {
            if (valorMatching >= porcentajeMatchMin && valorMatching < porcentajeMatchMax) {
                listaPacientesMin.push({
                    id: sugerido.id,
                    paciente: sugerido,
                    match: valorMatching
                });
            }
        }
    });

    if (listaPacientesMax.length > 0) {
        return listaPacientesMax;
    } else {
        return listaPacientesMin;
    }
}

/**
 * Delete de paciente
 *
 * @param objectId ---> Id del paciente a eliminar
 */

export async function deletePacienteAndes(objectId) {
    const query = { _id: objectId };
    let patientFound = await paciente.findById(query).exec();
    await patientFound.remove();

    EventCore.emitAsync('mpi:patient:delete', patientFound);
    return patientFound;
}


/* Funciones de operaciones PATCH */

export function updateContactos(req, data) {
    data.markModified('contacto');
    andesLog(req, logKeys.mpiUpdate.key, data, 'update contacto', data.contacto);
    data.contacto = req.body.contacto;
}

export function updateRelaciones(req, data) {
    data.markModified('relaciones');
    data.relaciones = req.body.relaciones;
}

export async function updateDireccion(req, data) {
    data.markModified('direccion');
    data.direccion = req.body.direccion;
    try {
        await actualizarGeoReferencia(data, req);
    } catch (err) {
        return err;
    }
}

export function updateCarpetaEfectores(req, data) {
    data.markModified('carpetaEfectores');
    data.carpetaEfectores = req.body.carpetaEfectores;
}

export function linkIdentificadores(req, data) {
    data.markModified('identificadores');
    if (data.identificadores) {
        data.identificadores.push(req.body.dto);
    } else {
        data.identificadores = [req.body.dto]; // Primer elemento del array
    }
}

export function unlinkIdentificadores(req, data) {
    data.markModified('identificadores');
    if (data.identificadores) {
        data.identificadores = data.identificadores.filter(x => x.valor !== req.body.dto.valor);
    }
}

export function updateActivo(req, data) {
    data.markModified('activo');
    data.activo = req.body.activo;
}

export function updateRelacion(nuevaRelacion, data) {
    if (data) {
        // verifico si el paciente tiene relaciones
        if (data.relaciones) {
            const objRel = data.relaciones.findIndex(elem =>
                elem && nuevaRelacion && elem.referencia && nuevaRelacion.referencia
                && elem.referencia.toString() === nuevaRelacion.referencia.toString()
            );

            data.markModified('relaciones');
            if (objRel < 0) {
                data.relaciones.push(nuevaRelacion);
            } else {
                data.relaciones[objRel] = nuevaRelacion;
            }
        } else {
            data.markModified('relaciones');
            data.relaciones = [nuevaRelacion];
        }
    }
}

export function deleteRelacion(req, data) {
    if (data && data.relaciones) {
        data.relaciones.find((value, index, array) => {
            if (value && value.referencia && req.body.dto && req.body.dto.referencia) {
                if (value.referencia.toString() === req.body.dto.referencia.toString()) {
                    array.splice(index, 1);
                }
            }
        });
    }
}

export function updateFotoMobile(req, data) {
    data.fotoMobile = req.body.fotoMobile;
}

export function updateScan(req, data) {
    data.markModified('scan');
    data.scan = req.body.scan;
}

export function updateCuil(req, data) {
    data.markModified('cuil');
    data.cuil = req.body.cuil;
}

export async function actualizarFinanciador(req, next) {
    let resultado = await this.buscarPaciente(req.body.paciente.id);
    // por ahora se pisa la información
    // TODO: analizar como sería
    if (req.body.paciente.obraSocial) {
        if (!resultado.paciente.financiador) {
            resultado.paciente.financiador = [];
        }
        resultado.paciente.financiador[0] = req.body.paciente.obraSocial;
        resultado.paciente.markModified('financiador');

        let pacienteAndes = resultado.paciente;
        Auth.audit(pacienteAndes, req);
        pacienteAndes.save((errPatch) => {
            if (errPatch) {
                return next(errPatch);
            }
            return;
        });
    }
}

export async function linkPacientes(req, dataLink, pacienteBase, pacienteLinkeado, op) {
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

    Auth.audit(pacienteLinkeado, req);
    try {
        await pacienteLinkeado.save();

        Auth.audit(pacienteBase, req);
        const pacienteSaved = await pacienteBase.save();

        andesLog(req, logKeys.mpiUpdate.key, pacienteBase._id, op, pacienteBase, pacienteLinkeado);
        return pacienteSaved;
    } catch {
        andesLog(req, logKeys.mpiUpdate.key, pacienteBase._id, op, pacienteBase, 'Error insertando paciente');
        return null;
    }
}

export async function checkCarpeta(req, data) {
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
            let unPaciente = await paciente.find(query).exec();
            return (unPaciente && unPaciente.length > 0);
        } else {
            return null;
        }
    } else {
        return null;
    }
}

/* Hasta acá funciones del PATCH */


/**
 *  Devuelve un array de pacientes similares al ingresado por parámetro
 *  Utiliza
 *
 * @param {*} nuevoPaciente
 * @returns Promise<boolean> || error
 */
export async function checkRepetido(nuevoPaciente, incluirTemporales = true): Promise<{ resultadoMatching: any[], dniRepetido: boolean, macheoAlto: boolean }> {
    let matchingInputData = {
        type: 'suggest',
        claveBlocking: 'documento',
        percentage: true,
        apellido: nuevoPaciente.apellido,
        nombre: nuevoPaciente.nombre,
        documento: nuevoPaciente.documento,
        sexo: ((typeof nuevoPaciente.sexo === 'string')) ? nuevoPaciente.sexo : (Object(nuevoPaciente.sexo).id),
        fechaNacimiento: nuevoPaciente.fechaNacimiento
    };

    let candidatos = await matching(matchingInputData);  // Handlear error en funcion llamadora
    // Filtramos al propio paciente y a los resultados por debajo de la cota minima
    candidatos = candidatos.filter(elem => {
        return (elem.paciente.id !== nuevoPaciente.id) && (elem.match > config.mpi.cotaMatchMin);
    });

    // Extraemos los validados de los resultados
    let similaresValidados = candidatos.filter(elem => elem.paciente.estado === 'validado');
    // Si el nuevo paciente está validado, filtramos los candidatos temporales
    if (!incluirTemporales) {
        candidatos = similaresValidados;
    }

    let macheoAlto = (candidatos.filter(element => element.match > config.mpi.cotaMatchMax).length > 0);
    let dniRepetido = similaresValidados.filter(element =>
        (element.paciente.sexo.toString() === matchingInputData.sexo.toString() && element.paciente.documento.toString() === matchingInputData.documento.toString())
    ).length > 0;

    let promiseArray = [];
    for (let resultado of candidatos) {
        let idPaciente = mongoose.Types.ObjectId(resultado.paciente.id);
        promiseArray.push(buscarPaciente(idPaciente));
    }
    let arrayAuxiliar = await Promise.all(promiseArray);
    let resultadoMatching = [];
    for (let index = 0; index < arrayAuxiliar.length; index++) {
        let pacienteCandidato = arrayAuxiliar[index].paciente;
        resultadoMatching.push({ paciente: pacienteCandidato });
        resultadoMatching[index].match = candidatos[index].match;
    }
    return { resultadoMatching, dniRepetido, macheoAlto };
}

/**
 * Intenta validar un paciente con fuentes auténticas.
 * Devuelve el paciente, y si fue validado o no (true/false)
 *
 * @param {*} pacienteAndes
 * @returns Object Paciente
 */
export async function validarPaciente(pacienteAndes, req: any = configPrivate.userScheduler) {
    let sexoPaciente = ((typeof pacienteAndes.sexo === 'string')) ? pacienteAndes.sexo : (Object(pacienteAndes.sexo).id);
    if (sexoPaciente === 'otro') {
        return { paciente: pacienteAndes, validado: false };
    }
    let resRenaper: any;
    const renaperConfig: RenaperConfig = {
        usuario: renaConfig.Usuario,
        password: renaConfig.password,
        url: renaConfig.url,
        server: renaConfig.serv
    };
    try {
        resRenaper = await renaper({ documento: pacienteAndes.documento, sexo: sexoPaciente }, renaperConfig, renaperToAndes);
        if (!resRenaper) {
            andesLog(req, logKeys.validacionPaciente.key, pacienteAndes.id, logKeys.validacionPaciente.operacion, null, 'Error validando paciente por RENAPER');
            return await validarSisa(pacienteAndes, req);
        }
        // Respuesta correcta de rennaper
        resRenaper.documento = pacienteAndes.documento;
        resRenaper.sexo = sexoPaciente;
        if (pacienteAndes.id) {
            const weights = config.mpi.weightsDefault;
            let match = new Matching();
            let matchPacienteRena = {
                documento: pacienteAndes.documento,
                nombre: resRenaper.nombres,
                apellido: resRenaper.apellido,
                fechaNacimiento: resRenaper.fechaNacimiento,
                sexo: sexoPaciente
            };
            const valorMatching = match.matchPersonas(pacienteAndes, matchPacienteRena, weights, config.algoritmo);
            resRenaper.matching = valorMatching;
            andesLog(req, logKeys.validacionPaciente.key, pacienteAndes.id, logKeys.validacionPaciente.operacion, resRenaper, pacienteAndes);
        } else {
            andesLog(req, logKeys.validacionPaciente.key, pacienteAndes.id, logKeys.validacionPaciente.operacion, resRenaper, null);
        }

        if (resRenaper.direccion.length) {
            // Completamos campos correspondientes a dirección legal
            let ubicacionRena = resRenaper.direccion[0].ubicacion;
            const ubicacionMatched = await localidadController.matchUbicacion(ubicacionRena.provincia.nombre, ubicacionRena.localidad.nombre);
            ubicacionRena = {
                pais: (ubicacionMatched.provincia) ? ubicacionMatched.provincia.pais : null,
                provincia: (ubicacionMatched.provincia) ? ubicacionMatched.provincia : null,
                localidad: (ubicacionMatched.localidad) ? ubicacionMatched.localidad : null,
                barrio: null,
            };
            resRenaper.direccion[1] = resRenaper.direccion[0];
            resRenaper.direccion[1].ubicacion = ubicacionRena;
            resRenaper.direccion[1].geoReferencia = null;
        }
        resRenaper.foto = await validarTamañoFoto(resRenaper.foto);
        resRenaper.estado = 'validado';
        const flag = !regtest.test(resRenaper.nombre) && !regtest.test(resRenaper.apellido);
        if (!flag) {
            // Si el apellido o nombre contiene caracteres extraños
            const rtaSisa = await validarSisa(resRenaper, req);
            if (rtaSisa && rtaSisa.paciente) {
                resRenaper.apellido = rtaSisa.paciente.apellido;
                resRenaper.nombre = rtaSisa.paciente.nombre;
            }
        }
        return { paciente: resRenaper, validado: true };

    } catch (err) {
        return await validarSisa(pacienteAndes, req);
    }

}

async function validarTamañoFoto(foto) {
    const buffer = Buffer.from(foto.substring(foto.indexOf(',') + 1));

    if (buffer.length > 50000) {
        let fotoNueva = await resizeFoto(foto);
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

async function validarSisa(pacienteAndes: any, req: any) {
    try {
        const sexoPaciente = ((typeof pacienteAndes.sexo === 'string')) ? pacienteAndes.sexo : (Object(pacienteAndes.sexo).id);
        pacienteAndes.sexo = sexoPaciente;
        let resSisa: any = await sisa({ documento: pacienteAndes.documento, sexo: sexoPaciente }, sisaConfig, sisaToAndes);
        andesLog(req, logKeys.validacionPaciente.key, pacienteAndes._id, logKeys.validacionPaciente.operacion, resSisa);
        if (resSisa) {
            if (resSisa.direccion.length && resSisa.direccion[0].ubicacion) {
                resSisa.direccion[0].ubicacion = await matchDireccion(resSisa.direccion[0].ubicacion);
            }
            if (pacienteAndes.id) {
                pacienteAndes.nombre = resSisa.nombre;
                pacienteAndes.apellido = resSisa.apellido;
                pacienteAndes.fechaNacimiento = resSisa.fechaNacimiento;
                pacienteAndes.estado = 'validado';
                return { paciente: pacienteAndes, validado: true };
            } else {
                return { paciente: resSisa, validado: true };
            }
        }
        return { paciente: pacienteAndes, validado: false };

    } catch (error) {
        andesLog(req, logKeys.validacionPaciente.key, pacienteAndes._id, logKeys.validacionPaciente.operacion, null, 'Error validando paciente por SISA');
        // no hacemos nada con el paciente
        return { paciente: pacienteAndes, validado: false };
    }
}

export async function matchDireccion(ubicacion) {
    const ubicacionMatched = await localidadController.matchUbicacion(ubicacion.provincia.nombre, ubicacion.localidad.nombre);
    const ubic = {
        pais: (ubicacionMatched.provincia) ? ubicacionMatched.provincia.pais : null,
        provincia: (ubicacionMatched.provincia) ? ubicacionMatched.provincia : null,
        localidad: (ubicacionMatched.localidad) ? ubicacionMatched.localidad : null,
        barrio: null,
    };
    return ubic;
}

/**
 * * Segun la entrada, retorna un Point con las coordenadas de geo referencia o null.
 * @param data debe contener direccion y localidad.
 */

export async function actualizarGeoReferencia(dataPaciente, req) {
    try {
        let pacienteOriginal = dataPaciente;
        // (valores de direccion fueron modificados): están completos?
        if (dataPaciente.direccion[0].valor && dataPaciente.direccion[0].ubicacion.localidad && dataPaciente.direccion[0].ubicacion.provincia) {
            let dir = dataPaciente.direccion[0].valor + ', ' + dataPaciente.direccion[0].ubicacion.localidad.nombre + ', ' + dataPaciente.direccion[0].ubicacion.provincia.nombre;
            const geoRef: any = await geoReferenciar(dir, configPrivate.geoKey);
            // georeferencia exitosa?
            if (geoRef && Object.keys(geoRef).length) {
                dataPaciente.direccion[0].geoReferencia = [geoRef.lat, geoRef.lng];
                let nombreBarrio = await getBarrio(geoRef, configPrivate.geoNode.host, configPrivate.geoNode.auth.user, configPrivate.geoNode.auth.password);
                // consulta exitosa?
                if (nombreBarrio) {
                    const barrioPaciente = await Barrio.findOne().where('nombre').equals(RegExp('^.*' + nombreBarrio + '.*$', 'i'));
                    if (barrioPaciente) {
                        dataPaciente.direccion[0].ubicacion.barrio = barrioPaciente;
                    }
                }
            } else {
                dataPaciente.direccion[0].geoReferencia = null;
                dataPaciente.direccion[0].ubicacion.barrio = null;
            }
            if (req) {
                // se guardan los datos
                updatePaciente(pacienteOriginal, dataPaciente, req);
            }
        } else {
            if (dataPaciente.direccion[0].georeferencia) {
                if (req) {
                    // se guardan los datos
                    updatePaciente(pacienteOriginal, dataPaciente, req);
                }
            }
        }
    } catch (err) {
        return (err);
    }
}

export async function getHistorialPaciente(req, dataPaciente) {
    try {
        let pipelineTurno = [];
        let pipelineSobreturno = [];
        if (req.query.desde) {
            pipelineTurno.push({ $match: { horaInicio: { $gte: moment(req.query.desde).startOf('day').toDate() } } });
            pipelineSobreturno.push({ $match: { horaInicio: { $gte: moment(req.query.desde).startOf('day').toDate() } } });
        }
        if (req.query.hasta) {
            pipelineTurno.push({ $match: { horaInicio: { $lte: moment(req.query.hasta).endOf('day').toDate() } } });
            pipelineSobreturno.push({ $match: { horaInicio: { $lte: moment(req.query.hasta).endOf('day').toDate() } } });
        }
        if (req.query.organizacion) {
            pipelineTurno.push({ $match: { 'organizacion._id': { $eq: new mongoose.Types.ObjectId(Auth.getOrganization(req)) } } });
            pipelineSobreturno.push({ $match: { 'organizacion._id': { $eq: new mongoose.Types.ObjectId(Auth.getOrganization(req)) } } });
        }
        if (req.query.conceptId) {
            pipelineTurno.push({ $match: { 'tipoPrestaciones.conceptId': req.query.conceptId } });
            pipelineSobreturno.push({ $match: { 'tipoPrestaciones.conceptId': req.query.conceptId } });
        }
        const turnos = [];
        let turno;
        pipelineTurno.push(

            {
                $match: {
                    estado: {
                        $nin: [
                            'planificacion',
                            'borrada',
                            'suspendida']
                    },
                    'bloques.turnos.paciente.id': { $in: dataPaciente.vinculos }
                }
            },
            {
                $unwind: {
                    path: '$bloques'
                }
            },
            {
                $unwind: {
                    path: '$bloques.turnos'
                }
            },
            {
                $match: {
                    'bloques.turnos.paciente.id': { $in: dataPaciente.vinculos }
                }
            },
            {
                $group: {
                    _id: {
                        id: '$_id',
                        turnoId: '$bloques.turnos._id'
                    },
                    agenda_id: {
                        $first: '$_id'
                    },
                    bloque_id: { $first: '$bloques._id' },
                    organizacion: {
                        $first: '$organizacion'
                    },
                    profesionales: {
                        $first: '$profesionales'
                    },
                    turno: {
                        $first: '$bloques.turnos'
                    },
                    espacioFisico: {
                        $first: '$espacioFisico'
                    }
                }
            },
            {
                $sort: {
                    'turno.horaInicio': -1.0
                }
            },
            {
                $project: {
                    turno: 1,
                    id: '$turnos._id',
                    agenda_id: 1,
                    bloque_id: 1,
                    organizacion: 1,
                    profesionales: 1,
                    paciente: '$turno.paciente',
                    espacioFisico: 1
                }
            }

        );
        pipelineSobreturno.push(

            {
                $match: {
                    estado: {
                        $nin: [
                            'planificacion',
                            'borrada',
                            'suspendida']
                    },
                    'sobreturnos.paciente.id': { $in: dataPaciente.vinculos }
                }
            },
            {
                $unwind: {
                    path: '$sobreturnos'
                }
            },
            {
                $match: {
                    'sobreturnos.paciente.id': { $in: dataPaciente.vinculos }
                }
            },
            {
                $group: {
                    _id: {
                        id: '$_id',
                        turnoId: '$sobreturnos._id'
                    },
                    agenda_id: {
                        $first: '$_id'
                    },
                    organizacion: {
                        $first: '$organizacion'
                    },
                    profesionales: {
                        $first: '$profesionales'
                    },
                    turno: {
                        $first: '$sobreturnos'
                    },
                    espacioFisico: {
                        $first: '$espacioFisico'
                    }
                }
            },
            {
                $sort: {
                    'turno.horaInicio': -1.0
                }
            },
            {
                $project: {
                    turno: 1,
                    id: '$turnos._id',
                    agenda_id: 1,
                    bloque_id: 1,
                    organizacion: 1,
                    profesionales: 1,
                    paciente: '$turno.paciente',
                    espacioFisico: 1
                }
            }

        );
        let resultado = await agenda.aggregate(pipelineTurno).exec();
        const sobreturnos = await agenda.aggregate(pipelineSobreturno).exec();
        resultado = resultado.concat(sobreturnos);
        return (resultado);
    } catch (error) {
        return (error);
    }
}


EventCore.on('mpi:patient:create', async (patientCreated) => {
    if (patientCreated.estado === 'validado') {
        const patientRequest = {
            user: patientCreated.createdBy,
            ip: 'localhost',
            connection: {
                localAddress: ''
            },
            body: patientCreated
        };
        await actualizarGeoReferencia(patientCreated, patientRequest);
        // linkea los pacientes validados con los temporales con un alto porcentaje de match
        const resultado = await checkRepetido(patientCreated, true);
        if (resultado.macheoAlto && resultado.resultadoMatching.length > 0) {
            // Verifica los resultados y linkea los pacientes
            resultado.resultadoMatching.forEach(async pacienteLink => {
                if (pacienteLink.paciente) {
                    const dataLink = {
                        entidad: 'ANDES',
                        valor: pacienteLink.paciente.id
                    };
                    await linkPacientes(patientRequest, dataLink, patientCreated, pacienteLink.paciente, 'link');
                }
            });
        }
    }

});
export async function buscarRelaciones(id) {
    const pac = await this.buscarPaciente(id);
    let relaciones = pac.paciente.relaciones;
    let arrayRelaciones: any = [];
    if (relaciones) {
        for (let index = 0; index < relaciones.length; index++) {
            let objetoRelacion: any = new Object();
            objetoRelacion.nombre = relaciones[index].nombre;
            objetoRelacion.apellido = relaciones[index].apellido;
            objetoRelacion.documento = relaciones[index].documento;
            objetoRelacion.relacion = relaciones[index].relacion;
            objetoRelacion.referencia = relaciones[index].referencia;
            let pacienteRelacion: any = await this.buscarPaciente(relaciones[index].referencia);
            objetoRelacion.id = pacienteRelacion.paciente._id;
            objetoRelacion.edad = calcularEdad(pacienteRelacion.paciente.fechaNacimiento);
            arrayRelaciones.push(objetoRelacion);
        }
    }
    return arrayRelaciones;
}

export function calcularEdad(fecha) {
    let edad = null;
    if (fecha) {
        const birthDate = new Date(fecha);
        const currentDate = new Date();
        let years = (currentDate.getFullYear() - birthDate.getFullYear());
        if (currentDate.getMonth() < birthDate.getMonth() ||
            currentDate.getMonth() === birthDate.getMonth() && currentDate.getDate() < birthDate.getDate()) {
            years--;
        }
        edad = years;
    }
    return edad;
}

export function edadReal(fecha) {
    // Calcula Edad de una persona (Redondea -- 30.5 años = 30 años)
    let edad: Object;
    let fechaNac: any;
    const fechaActual: Date = new Date();
    let fechaAct: any;
    let difAnios: any;
    let difDias: any;
    let difMeses: any;
    let difHs: any;

    fechaNac = moment(fecha, 'YYYY-MM-DD HH:mm:ss');
    fechaAct = moment(fechaActual, 'YYYY-MM-DD HH:mm:ss');
    difDias = fechaAct.diff(fechaNac, 'd'); // Diferencia en días
    difAnios = Math.floor(difDias / 365.25);
    difMeses = Math.floor(difDias / 30.4375);
    difHs = fechaAct.diff(fechaNac, 'h'); // Diferencia en horas


    if (difAnios !== 0) {
        edad = {
            valor: difAnios,
            unidad: 'Años'
        };
    } else if (difMeses !== 0) {
        edad = {
            valor: difMeses,
            unidad: 'Meses'
        };
    } else if (difDias !== 0) {
        edad = {
            valor: difDias,
            unidad: 'Días'
        };
    } else if (difHs !== 0) {
        edad = {
            valor: difHs,
            unidad: 'Horas'
        };
    }

    return edad;
}

export function matchPatient(pacienteA, pacienteB, weightsDefault?: any) {
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
