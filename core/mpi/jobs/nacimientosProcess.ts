import { paciente } from '../schemas/paciente';
import moment = require('moment');
import { userScheduler } from '../../../config.private';
import { buscarPacienteWithcondition, createPaciente, updatePaciente, validarPaciente } from '../controller/paciente';
import * as https from 'https';
import { Types } from 'mongoose';
import debug = require('debug');
import { registroProvincialData } from '../../../config.private';
import { Logger } from '../../../utils/logService';
import { handleHttpRequest } from '../../../utils/requestHandler';
const deb = debug('nacimientosJob');

// Variable utilizada en testing
let fechaPrueba;
/**
 * Obtiene todos los bebes nacidos a partir de la fecha pasada por parámetro.
 * Fuente: Registro provincial de las personas
 *
 * @param {string} fecha
 * @returns Promise<{}>
 */
async function getInfoNacimientos() {
    let today = moment().format('YYYY-MM-DD');
    if (fechaPrueba) {
        today = fechaPrueba;
    }
    let queryFechaPath = registroProvincialData.queryFechaPath + today;
    let dataNacimientos = await handleHttpRequest(queryFechaPath);
    deb('Response query Nacimientos -->', dataNacimientos[0]);
    deb('INFO NACIMIENTOS-->', dataNacimientos[1]);

    // Transformamos la respuesta en un array JSON correcto
    let lastChar = dataNacimientos[1].lastIndexOf(',');
    dataNacimientos[1] = dataNacimientos[1].substring(0, lastChar);
    dataNacimientos[1] = '[' + dataNacimientos[1] + ']';
    dataNacimientos[1] = JSON.parse(dataNacimientos[1]);
    return (dataNacimientos[1]);
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
            return elem.nombre.trim() === bebeAndes.nombre && elem.apellido.trim() === bebeAndes.apellido;
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

export async function importarNacimientos(done, fecha: string = null) {
    fechaPrueba = fecha;
    let infoNacimientosArray = await getInfoNacimientos();
    for (let nacimiento of infoNacimientosArray) {
        deb('Elemento ----->', nacimiento);
        await procesarDataNacimientos(nacimiento);
    }
    deb('Proceso Finalizado');
    done();
}
