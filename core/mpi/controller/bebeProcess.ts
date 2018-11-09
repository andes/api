

import { paciente } from '../schemas/paciente';
import { Auth } from '../../../auth/auth.class';
import { matchSisa } from '../../../utils/servicioSisa';
import moment = require('moment');
import { ElasticSync } from '../../../utils/elasticSync';
import { Logger } from '../../../utils/logService';
import { userScheduler } from '../../../config.private';
import { buscarPacienteWithcondition, createPaciente, updatePaciente } from './paciente';
import * as https from 'https';
import { getServicioRenaper } from '../../../utils/servicioRenaper';
import { MatchingMetaphone } from '@andes/match/lib/matchingMetaphone.class';
import { Types } from 'mongoose';
const regtest = /[^a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ ']+/;

/**
 * Obtiene todos los bebes nacidos a partir de la fecha pasada por parámetro.
 * Fuente: Registro provincial de las personas
 *
 * @param {string} fecha
 * @returns Promise<{}>
 */
function getBebes(fecha: string) {
    return new Promise((resolve, reject) => {
        // PASAR AL CONFIG ----------------------------------
        let dprcpHost = 'dprcp.neuquen.gob.ar';
        let queryFechaPath = '/serneuquen/backend/obtenernacidofecha.php?fecha=' + fecha;

        const optionsgetmsg = {
            host: dprcpHost,
            port: 443,
            path: queryFechaPath,
            method: 'GET',
            rejectUnauthorized: false
        };

        let databebes = '';
        const reqGet = https.request(optionsgetmsg, (res2) => {
            res2.on('data', (data, error) => {
                if (error) { reject(error); }
                databebes = databebes + data.toString();
            });
            res2.on('end', () => {
                // Transformamos la respuesta en un array JSON correcto
                let lastChar = databebes.lastIndexOf(',');
                databebes = databebes.substring(0, lastChar);
                databebes = '[' + databebes + ']';
                databebes = JSON.parse(databebes);
                resolve(databebes);

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
    let bebeAndes: any = await createPaciente(bebe, userScheduler);
    // TODO loguear creacion paciente
    let updateBebe = {
        relaciones: [{
            relacion: {
                _id: new Types.ObjectId('59247be21ebf0273353b23bf'),
                nombre: 'progenitor/a',
                opuesto: 'hijo/a'
            },
            referencia: mama._id,
            nombre: mama.nombre,
            apellido: mama.apellido,
            documento: mama.documento
        }]
    };
    let updateMama = {
        relaciones: [{
            relacion: {
                _id: new Types.ObjectId('59247c391ebf0273353b23c0'),
                nombre: 'hijo/a',
                opuesto: 'progenitor/a'
            },
            referencia: bebeAndes._id,
            nombre: bebeAndes.nombre,
            apellido: bebeAndes.apellido,
            documento: bebeAndes.documento
        }]
    };

    let bebeUpdated = await updatePaciente(bebeAndes, updateBebe, userScheduler);
    Logger.log(userScheduler, 'mpi', 'update', {
        original: bebeAndes,
        nuevo: bebeUpdated
    });
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
            sexo: 'femenino', // Hardcodear está mal pero el dato no viene, suponemos femenino
            genero: 'femenino', // Hardcodear está mal pero el dato no viene, suponemos femenino
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

async function procesarPacientes(pacienteImportado) {
    let resultadoParse: any = parsearPacientes(pacienteImportado);
    try {
        let mama = await buscarPacienteWithcondition({ documento: resultadoParse.mama.documento, sexo: 'femenino' });
        // Existe en ANDES?
        if (mama) {
            if (mama.paciente.estado === 'temporal') {
                try {
                    let pac = await validarPaciente(mama.paciente);
                    relacionar(pac, resultadoParse.bebe);
                } catch (error) {
                    // Logger.log(userScheduler, 'mpi', 'update', {
                    //     original: mama,
                    //     nuevo: mamaUpdated
                    // });
                    console.log(2, error);
                }
            }
        } else {
            // No existe en ANDES
            // Obtener paciente de Fuentas auténticas
            let nuevaMama = await validarPaciente(resultadoParse.mama);
            let mamaAndes = await createPaciente(nuevaMama, userScheduler);
            relacionar(mamaAndes, resultadoParse.bebe);
        }
    } catch (error) {
        // NO ENCONTRADO O ERROR
        // Obtener paciente de Fuentas auténticas
        let nuevaMama = await validarPaciente(resultadoParse.mama);
        let mamaAndes: any = await createPaciente(nuevaMama, userScheduler);
        relacionar(mamaAndes, resultadoParse.bebe);

    }

}

export async function importBebes(done) {
    const today = moment().format('YYYY-MM-DD');
    let babyarray = await getBebes(today);
    for (let bebe of babyarray as [any]) {
        await procesarPacientes(bebe);
    }
    done();
}
