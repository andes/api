import { paciente } from '../schemas/paciente';
import moment = require('moment');
import { buscarPacienteWithcondition, matching, createPaciente, updatePaciente, validarPaciente } from '../controller/paciente';
import { Types } from 'mongoose';
import debug = require('debug');
import { registroProvincialData, userScheduler } from '../../../config.private';
import { mpiNacimientosLog } from '../mpi.log';
import { handleHttpRequest } from '../../../utils/requestHandler';
const nacimientosLog = mpiNacimientosLog.startTrace();
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
    // Buscamos si el bebe fué previamente registrado como temporal
    let bebeSimilitudes = await matching({
        type: 'suggest',
        nombre: bebe.nombre,
        apellido: bebe.apellido,
        fechaNacimiento: bebe.fechaNacimiento,
        documento: bebe.documento ? bebe.documento : ''
    });

    if (bebeSimilitudes.length && bebeSimilitudes[0].match >= 0.94) {
        if (bebe.documento?.length && !bebeSimilitudes[0].paciente.documento?.length) {
            // Actualizamos documento de bebe existente en caso de ser necesario
            bebeSimilitudes[0].paciente.documento = bebe.documento;
            bebe = bebeSimilitudes[0].paciente;
        }
    }

    // Incluimos a la mamá en las relaciones del bebe en caso de no estarlo
    if (!bebe.relaciones?.length || !bebe.relaciones.some(rel => rel.referencia === mama._id)) {
        let mamaRelacion = {
            relacion: {
                _id: new Types.ObjectId('59247be21ebf0273353b23bf'),
                nombre: 'progenitor/a',
                opuesto: 'hijo/a'
            },
            referencia: mama._id,
            nombre: mama.nombre,
            apellido: mama.apellido,
            documento: mama.documento ? mama.documento : null,
            numeroIdentificacion: mama.numeroIdentificacion ? mama.numeroIdentificacion : null,
            foto: mama.foto ? mama.foto : null,
            fechaFallecimiento: mama.fechaFallecimiento ? mama.fechaFallecimiento : null
        };
        bebe.relaciones?.length ? bebe.relaciones.push(mamaRelacion) : bebe.relaciones = [mamaRelacion];
    }

    // Insertamos/actualizamos al bebé
    let bebeAndes: any = bebe._id ? await createPaciente(bebe, userScheduler) : await updatePaciente(bebeSimilitudes[0].paciente, bebe, userScheduler);

    // Incluimos al bebe en las relaciones de la mamá en caso de no estarlo
    if (!mama.relaciones?.length || !mama.relaciones.some(rel => rel.referencia === bebe.id)) {
        let bebeRelacion = {
            relacion: {
                _id: new Types.ObjectId('59247c391ebf0273353b23c0'),
                nombre: 'hijo/a',
                opuesto: 'progenitor/a'
            },
            referencia: bebeAndes._id,
            nombre: bebeAndes.nombre,
            apellido: bebeAndes.apellido,
            documento: bebeAndes.documento ? bebeAndes.documento : null,
            numeroIdentificacion: bebeAndes.numeroIdentificacion ? bebeAndes.numeroIdentificacion : null,
            foto: bebeAndes.foto ? bebeAndes.foto : null,
            fechaFallecimiento: bebeAndes.fechaFallecimiento ? bebeAndes.fechaFallecimiento : null
        };
        mama.relaciones?.length ? mama.relaciones.push(bebeRelacion) : mama.relaciones = [bebeRelacion];
    }

    let updateMama = {
        estado: mama.estado,
        foto: mama.foto ? mama.foto : '',
        relaciones: mama.relaciones
    };

    deb('UPDATE MAMA--->', updateMama);
    userScheduler['body'] = mama;
    const mamaUpdated = await updatePaciente(mama, updateMama, userScheduler);
    await nacimientosLog.info('nacimiento-updated-ok', { tutor: mamaUpdated._id, bebe: bebeAndes._id }, userScheduler);
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

async function validar(dataPaciente) {
    let resultado: any = await validarPaciente(dataPaciente, userScheduler);
    // Actualizamos datos
    dataPaciente.nombre = resultado.paciente.nombre;
    dataPaciente.apellido = resultado.paciente.apellido;
    dataPaciente.estado = resultado.paciente.estado;
    dataPaciente.fechaNacimiento = moment(resultado.paciente.fechaNacimiento).add(4, 'h').toDate(); // mas mers alert
    dataPaciente.foto = resultado.paciente.foto;
    if (resultado.paciente.fechaFallecimiento) {
        dataPaciente.fechaFallecimiento = moment(resultado.paciente.fechaFallecimiento).add(4, 'h').toDate();
    }
    //  Se completan datos FALTANTES
    if (!this.pacienteModel.direccion[0].valor && resultado.paciente.direccion && resultado.paciente.direccion[0].valor) {
        dataPaciente.direccion[0].valor = resultado.paciente.direccion[0].valor;
    }
    if (!this.pacienteModel.direccion[0].codigoPostal && resultado.paciente.cpostal) {
        dataPaciente.direccion[0].codigoPostal = resultado.paciente.cpostal;
    }
    if (resultado.paciente.direccion[1]) {  // direccion legal
        dataPaciente.direccion[1] = resultado.paciente.direccion[1];
    }
    if (!this.pacienteModel.cuil && resultado.paciente.cuil) {
        dataPaciente.cuil = resultado.paciente.cuil;
    }
    return dataPaciente;
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
                resultadoBusqueda.paciente = validar(resultadoBusqueda.paciente);
            }
            await relacionar(resultadoBusqueda.paciente, resultadoParse.bebe);
        } else {
            // No existe en ANDES
            // --> Obtener paciente de Fuentas auténticas
            let nuevaMama = await validar(resultadoParse.mama);
            userScheduler['body'] = nuevaMama;
            const mamaAndes = await createPaciente(nuevaMama, userScheduler);
            await relacionar(mamaAndes, resultadoParse.bebe);
        }
    } catch (error) {

        // No existe en ANDES,  la función buscarPacienteWithcondition hace un reject cuando no encuentra al paciente
        // entonces tenemos que seguir la ejecución en este catch
        // --> Obtener paciente de Fuentas auténticas
        let nuevaMama = await validar(resultadoParse.mama);
        userScheduler['body'] = nuevaMama;
        const mamaAndes = await createPaciente(nuevaMama, userScheduler);
        await relacionar(mamaAndes, resultadoParse.bebe);
    }
}

export async function importarNacimientos(done, fecha: string = null) {
    fechaPrueba = fecha;
    let infoNacimientosArray = await getInfoNacimientos();
    for (let nacimiento of infoNacimientosArray) {
        deb('Elemento ----->', nacimiento);
        try {
            await procesarDataNacimientos(nacimiento);
        } catch (err) {
            let sexoTutor = nacimiento.ntiposexo === '1' ? 'masculino' : 'femenino';
            await nacimientosLog.error('nacimiento-updated-error', { dniTutor: nacimiento.nrodoc, sexo: sexoTutor }, err, userScheduler);
        }
    }
    deb('Proceso Finalizado');
    done();
}
