

import { paciente } from '../schemas/paciente';
import { Auth } from '../../../auth/auth.class';
import { matchSisa } from '../../../utils/servicioSisa';
import moment = require('moment');
import { ElasticSync } from '../../../utils/elasticSync';
import { Logger } from '../../../utils/logService';
import { userScheduler } from '../../../config.private';
import { buscarPacienteWithcondition, createPaciente, updatePaciente, updatePacienteMpi } from './paciente';
import * as https from 'https';
import { getServicioRenaper } from '../../../utils/servicioRenaper';
import { MatchingMetaphone } from '@andes/match/lib/matchingMetaphone.class';
import { Types } from 'mongoose';
import debug = require('debug');
import { registroProvincialData } from '../../../config.private';
const deb = debug('bebeJob');

const regtest = /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ ']+/;
let fechaPrueba;
/**
 * Obtiene todos los bebes nacidos a partir de la fecha pasada por parámetro.
 * Fuente: Registro provincial de las personas
 *
 * @param {string} fecha
 * @returns Promise<{}>
 */
function getInfoNacimientos(): Promise<any[]> {
    return new Promise((resolve, reject) => {
        let today = moment().format('YYYY-MM-DD');
        if (fechaPrueba) {
            today = fechaPrueba;
        }
        let dprcpHost = registroProvincialData.hostost;
        let queryFechaPath = registroProvincialData.queryFechaPath + today;

        const optionsgetmsg = {
            host: dprcpHost,
            port: 443,
            path: queryFechaPath,
            method: 'GET',
            rejectUnauthorized: false
        };

        let dataNacimientos;
        const reqGet = https.request(optionsgetmsg, (res2) => {
            res2.on('data', (data, error) => {
                if (error) { reject(error); }
                dataNacimientos = dataNacimientos + data.toString();
            });
            res2.on('end', () => {
                // Transformamos la respuesta en un array JSON correcto
                let lastChar = dataNacimientos.lastIndexOf(',');
                dataNacimientos = dataNacimientos.substring(0, lastChar);
                dataNacimientos = '[' + dataNacimientos + ']';
                dataNacimientos = JSON.parse(dataNacimientos);
                resolve(dataNacimientos);

            });
            res2.on('error', (error) => {
                reject(error);
            });
        });
        reqGet.end();
    });
}

/**
 * Intenta validar un paciente con fuentes auténticas.
 * Devuelve el paciente, validado o no
 *
 * @param {*} pacienteAndes
 * @returns Object Paciente
 */
async function validarPaciente(pacienteAndes) {

    let sexoRenaper = pacienteAndes.sexo === 'masculino' ? 'M' : 'F';
    let resRenaper: any;
    try {
        resRenaper = await getServicioRenaper({ documento: pacienteAndes.documento, sexo: sexoRenaper });
    } catch (error) {
        return await validarSisa(pacienteAndes);
    }
    let band = true;
    // Respuesta correcta de renaper?
    if (resRenaper && resRenaper.datos.nroError === 0) {
        let pacienteRenaper = resRenaper.datos;
        band = regtest.test(pacienteRenaper.nombres);
        band = band || regtest.test(pacienteRenaper.apellido);
        if (!band) {
            pacienteAndes.nombre = pacienteRenaper.nombres;
            pacienteAndes.apellido = pacienteRenaper.apellido;
            pacienteAndes.fechaNacimiento = new Date(pacienteRenaper.fechaNacimiento);
            pacienteAndes.cuil = pacienteRenaper.cuil;
            pacienteAndes.estado = 'validado';
            pacienteAndes.foto = pacienteRenaper.foto;
        }
        return pacienteAndes;
    }
    // Respuesta erronea de renaper o test regex fallido?
    if (!resRenaper || resRenaper.datos.nroError !== 0 || band) {
        return await validarSisa(pacienteAndes);
    }
}

async function validarSisa(pacienteAndes: any) {
    try {
        let resSisa: any = await matchSisa(pacienteAndes);
        let porcentajeMatcheo = resSisa.matcheos.matcheo;
        if (porcentajeMatcheo > 95) {
            pacienteAndes.nombre = resSisa.matcheos.datosPaciente.nombre;
            pacienteAndes.apellido = resSisa.matcheos.datosPaciente.apellido;
            pacienteAndes.fechaNacimiento = resSisa.matcheos.datosPaciente.fechaNacimiento;
            pacienteAndes.estado = 'validado';
        }
        return pacienteAndes;
    } catch (error) {
        // no hacemos nada con el paciente
        return pacienteAndes;
    }
}

async function relacionar(mama, bebe) {
    // Insertamos al bebé en ANDES
    bebe.relaciones = [{
        relacion: {
            _id: new Types.ObjectId('59247be21ebf0273353b23bf'),
            nombre: 'progenitor/a',
            opuesto: 'hijo/a'
        },
        referencia: mama._id,
        nombre: mama.nombre,
        apellido: mama.apellido,
        documento: mama.documento,
    }];
    let bebeAndes: any = await createPaciente(bebe, userScheduler);
    Logger.log(userScheduler, 'mpi', 'insert', {
        paciente: bebeAndes
    });

    if (mama.relaciones) {
        let resultado = mama.relaciones.filter(elem => {
            return elem.nombre === bebeAndes.nombre && elem.apellido === bebeAndes.apellido;
        });
        deb('RESULTADOO --->', resultado);
        if (resultado.length === 0) {
            mama.relaciones.push({
                relacion: {
                    _id: new Types.ObjectId('59247c391ebf0273353b23c0'),
                    nombre: 'hijo/a',
                    opuesto: 'progenitor/a'
                },
                referencia: bebeAndes._id,
                nombre: bebeAndes.nombre,
                apellido: bebeAndes.apellido,
                documento: bebeAndes.documento,
            });
        }
    } else {
        mama.relaciones = [{
            relacion: {
                _id: new Types.ObjectId('59247c391ebf0273353b23c0'),
                nombre: 'hijo/a',
                opuesto: 'progenitor/a'
            },
            referencia: bebeAndes._id,
            nombre: bebeAndes.nombre,
            apellido: bebeAndes.apellido,
            documento: bebeAndes.documento,
        }];
    }

    let updateMama = {
        estado: mama.estado,
        foto: mama.foto ? mama.foto : '',
        relaciones: mama.relaciones
    };


    // deb('UPDATE MAMA--->', updateMama);
    let mamaUpdated = await updatePaciente(mama, updateMama, userScheduler);
    Logger.log(userScheduler, 'mpi', 'update', {
        original: mama,
        nuevo: mamaUpdated
    });
}

function parsearPacientes(importedData) {
    let parsedData = {
        bebe: {
            nombre: importedData.nnombres.trim(),
            apellido: importedData.napellidos.trim(),
            estado: 'temporal',
            documento: '', // Los bebés no tienen DNI
            certificadoRenaper: importedData.nrocertificado.trim(),
            fechaNacimiento: moment(importedData.nfechanac.trim(), 'YYYY-MM-DD', 'ar', true),
            horaNacimiento: importedData.nhoranac.trim(),
            sexo: (importedData.ntiposexo === '1' ? 'masculino' : 'femenino'),
            genero: (importedData.ntiposexo === '1' ? 'masculino' : 'femenino'),
            contacto: [],
            direccion: []
        },
        mama: {
            estado: 'temporal',
            nombre: importedData.nombres.trim(),
            apellido: importedData.apellidos.trim(),
            documento: importedData.nrodoc.trim(),
            fechaNacimiento: moment(importedData.fechanac.trim(), 'YYYY-MM-DD', 'ar', true),
            sexo: 'femenino',
            genero: 'femenino',
            contacto: [],
            direccion: []
        }
    };

    if (importedData.mail.trim() !== '') {
        parsedData.mama.contacto.push({
            tipo: 'email',
            valor: importedData.mail.trim(),
            ultimaActualizacion: moment()
        });
        parsedData.bebe.contacto.push({
            tipo: 'email',
            valor: importedData.mail.trim(),
            ultimaActualizacion: moment()
        });
    }
    if (importedData.telefono.trim() !== '') {
        parsedData.mama.contacto.push({
            tipo: 'fijo',
            valor: importedData.telefono.trim(),
            ultimaActualizacion: moment()
        });
        parsedData.bebe.contacto.push({
            tipo: 'fijo',
            valor: importedData.telefono.trim(),
            ultimaActualizacion: moment()
        });
    }

    parsedData.mama.direccion = parsedData.bebe.direccion = null;
    let bebe = new paciente(parsedData.bebe);
    let mama = new paciente(parsedData.mama);
    return { bebe, mama };
}

async function procesarDataNacimientos(nacimiento) {
    let resultadoParse: any = parsearPacientes(nacimiento);
    deb('PARSER RESULT--->', resultadoParse);
    try {
        let resultadoBusqueda = await buscarPacienteWithcondition({ documento: resultadoParse.mama.documento, sexo: 'femenino' });
        // Existe en ANDES?
        deb('Resultado Busqueda --> ', resultadoBusqueda.db);
        if (resultadoBusqueda) {
            if (resultadoBusqueda.paciente.estado === 'temporal') {
                await validarPaciente(resultadoBusqueda.paciente);
            }
            await relacionar(resultadoBusqueda.paciente, resultadoParse.bebe);
        } else {
            // No existe en ANDES
            // --> Obtener paciente de Fuentas auténticas
            let nuevaMama = await validarPaciente(resultadoParse.mama);
            let mamaAndes = await createPaciente(nuevaMama, userScheduler);
            await relacionar(mamaAndes, resultadoParse.bebe);
        }
    } catch (error) {

        // No existe en ANDES,  la función buscarPacienteWithcondition hace un reject cuando no encuentra al paciente
        // entonces tenemos que seguir la ejecución en este catch
        // --> Obtener paciente de Fuentas auténticas
        let nuevaMama = await validarPaciente(resultadoParse.mama);
        let mamaAndes = await createPaciente(nuevaMama, userScheduler);
        await relacionar(mamaAndes, resultadoParse.bebe);
    }
}

export async function importBebes(done, fecha: string = null) {
    fechaPrueba = fecha;
    let infoNacimientosArray = await getInfoNacimientos();
    for (let nacimiento of infoNacimientosArray) {
        deb('Elemento ----->', nacimiento);
        await procesarDataNacimientos(nacimiento);
    }
    deb('Proceso Finalizado');
    done();
}
