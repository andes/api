import { paciente } from '../schemas/paciente';
import moment = require('moment');
import { matching, createPaciente, updatePaciente, validarPaciente } from '../controller/paciente';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
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
async function getInfoPacientes(queryPath = '') {
    if (!queryPath) {
        return [];
    }
    try {
        let dataNacimientos = await handleHttpRequest(queryPath);

        // Transformamos la respuesta en un array JSON correcto
        const lastChar = dataNacimientos[1].lastIndexOf(',');
        dataNacimientos[1] = dataNacimientos[1].substring(0, lastChar);
        dataNacimientos[1] = '[' + dataNacimientos[1] + ']';
        return JSON.parse(dataNacimientos[1]);
    } catch (error) {
        return error;
    }
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
    userScheduler['body'] = bebe;
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
    await nacimientosLog.info('nacimiento-updated', { tutor: mamaUpdated._id, bebe: bebeAndes._id }, userScheduler);
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
            direccion: [],
            activo: true
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
            direccion: [],
            activo: true
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

    let bebe = new paciente(parsedData.bebe);
    let mama = new paciente(parsedData.mama);
    return { bebe, mama };
}

async function validar(dataPaciente) {
    let resultado: any = await validarPaciente(dataPaciente, userScheduler);
    // Actualizamos datos
    if (!resultado || !resultado.validado) {
        return dataPaciente;
    }
    dataPaciente.nombre = resultado.paciente.nombre;
    dataPaciente.apellido = resultado.paciente.apellido;
    dataPaciente.estado = resultado.paciente.estado;
    dataPaciente.fechaNacimiento = moment(resultado.paciente.fechaNacimiento).toDate();
    dataPaciente.foto = resultado.paciente.foto;
    if (resultado.paciente.fechaFallecimiento) {
        dataPaciente.fechaFallecimiento = moment(resultado.paciente.fechaFallecimiento).toDate();
    }

    //  Se completan datos FALTANTES
    if (!dataPaciente.direccion?.[0] && resultado.paciente.direccion && resultado.paciente.direccion[0]) {
        dataPaciente.direccion = resultado.paciente.direccion;
    }
    if (resultado.paciente.direccion?.[1]) {  // direccion legal
        dataPaciente.direccion[1] = resultado.paciente.direccion[1];
    }
    if (!dataPaciente.cuil && resultado.paciente.cuil) {
        dataPaciente.cuil = resultado.paciente.cuil;
    }

    return dataPaciente;
}


async function procesarDataNacimientos(nacimiento) {
    let resultadoParse: any = parsearPacientes(nacimiento);
    deb('PARSER RESULT--->', resultadoParse);
    try {
        let pacientesFound = await PacienteCtr.search({ documento: resultadoParse.mama.documento, activo: true, sexo: 'femenino' }, { limit: 1 }, userScheduler as any);
        // Existe en ANDES?
        if (pacientesFound?.length) {
            if (pacientesFound[0].estado === 'temporal') {
                pacientesFound[0] = validar(pacientesFound[0]);
            }
            await relacionar(pacientesFound[0], resultadoParse.bebe);
        } else {
            // No existe en ANDES
            // --> Obtener paciente de Fuentas auténticas
            let nuevaMama = await validar(resultadoParse.mama);
            userScheduler['body'] = nuevaMama;
            const mamaAndes = await createPaciente(nuevaMama, userScheduler);
            await relacionar(mamaAndes, resultadoParse.bebe);
        }
    } catch (error) {
        return error;
    }
}

export async function importarNacimientos(done) {
    let fecha = fechaPrueba || moment().format('YYYY-MM-DD');
    let queryFechaPath = registroProvincialData.queryFechaPath + fecha;
    const infoNacimientosArray = await getInfoPacientes(queryFechaPath);
    for (let nacimiento of infoNacimientosArray) {
        deb('Elemento ----->', nacimiento);
        try {
            await procesarDataNacimientos(nacimiento);
        } catch (err) {
            let sexoTutor = nacimiento.ntiposexo === '1' ? 'masculino' : 'femenino';
            await nacimientosLog.error('nacimiento-updated', { dniTutor: nacimiento.nrodoc, sexo: sexoTutor }, err, userScheduler);
        }
    }
    deb('Proceso Importar Nacimientos Finalizado');
    done();
}

/**
 * se actualizan los datos de todos los pacientes con dni = '' que contengan certificadoRenaper
 */
export async function agregarDocumentosFaltantes() {
    try {
        // Buscamos en andes los bebes que aún no tienen documento
        let resultadoBusqueda: any = await PacienteCtr.search({ documento: '', certificadoRenaper: { $exists: true }, activo: true }, {}, userScheduler as any);
        for (let pacienteBebe of resultadoBusqueda) {
            const certificadoFechaPath = registroProvincialData.queryNacidoByCertificado + pacienteBebe.certificadoRenaper;
            let bebe = await getInfoPacientes(certificadoFechaPath);
            updateDatosPaciente(bebe[0], pacienteBebe);
        }
    } catch (error) {
        await nacimientosLog.error('nacimiento-updated', null, error, userScheduler);
        return error;
    }
    deb('Proceso Agregar documentos Faltantes Finalizado');
}

/**
 * Se actualizan todos los pacientes que fueron modificados desde una "fecha" determinada
 * si no recibe fecha utiliza la fecha actual
 * @param fecha
 */
export async function obtenerModificaciones(fecha: string = null) {
    if (!fecha) {
        fecha = fechaPrueba || moment().format('YYYY-MM-DD');
    }
    try {
        // importamos todos los bebes que fueron modificados desde la "fecha" requerida
        const queryPath = registroProvincialData.queryNacidoByFechaModificacion + fecha;
        const resultadoBusqueda = await getInfoPacientes(queryPath);

        for (let bebeMod of resultadoBusqueda) {
            const pacientes = await PacienteCtr.search({ certificadoRenaper: bebeMod.nrocertificado, activo: true, estado: 'temporal' }, { limit: 1 }, userScheduler as any);
            if (pacientes.length && pacientes[0]._id) {
                let bebe = pacientes[0];
                bebe.id = bebe._id;
                await updateDatosPaciente(bebeMod, bebe);
            }
        }
    } catch (error) {
        await nacimientosLog.error('nacimiento-updated', null, error, userScheduler);
        return error;
    }
    deb('Proceso Obtener Modificaciones del día Finalizado');
}

/**
 * Se actualizan los datos del pacienteAndes con los datos exportados desde el Registro Civil
 * y se validan con fuentes Auténticas
 * @param pacienteExport paciente exportado desde Registro Civil
 * @param pacienteAndes paciente de Andes
 */
async function updateDatosPaciente(pacienteExport = null, pacienteAndes = null) {
    if (pacienteExport && pacienteAndes && pacienteExport.nnrodoc !== '0') {
        pacienteAndes.documento = pacienteExport.nnrodoc.replace(/-|\./g, '');
        // validamos el paciente para actualizar datos y foto
        const bebeValidado = await validar(pacienteAndes);
        if (bebeValidado.estado === 'validado') {
            const updateBebe = {
                documento: bebeValidado.documento,
                apellido: bebeValidado.apellido,
                nombre: bebeValidado.nombre,
                foto: bebeValidado.foto || null,
                estado: bebeValidado.estado,
                activo: bebeValidado.activo,
                fechaFallecimiento: bebeValidado.fechaFallecimiento || null
            };
            userScheduler['body'] = bebeValidado;
            await updatePaciente(pacienteAndes, updateBebe, userScheduler);
        }
    }
}
