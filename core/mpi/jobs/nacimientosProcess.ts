import { paciente } from '../schemas/paciente';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { validar } from '../../../core-v2/mpi/validacion';
import { registroProvincialData, userScheduler } from '../../../config.private';
import { mpiNacimientosLog } from '../mpi.log';
import { handleHttpRequest } from '../../../utils/requestHandler';
import { IPaciente } from '../../../core-v2/mpi/paciente/paciente.interface';
import moment = require('moment');
import debug = require('debug');
import { ParentescoCtr } from '../parentesco.routes';

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
    // Buscamos si el paciente bebe fué previamente registrado como temporal
    const token = `^${bebe.nombre} ${bebe.apellido} ${bebe.documento || ''}`;
    let fechaNacimiento = moment(bebe.fechaNacimiento).format('YYYY-MM-DD');
    const bebeSimilitudes = await PacienteCtr.search({ tokens: token, fechaNacimiento, activo: true }, {}, userScheduler as any);
    if (bebeSimilitudes.length > 0) {
        // buscamos entre las relaciones de bebeSimilares a la mamá, si la encontramos nos quedamos con ese bebé
        // (debería encontrar a 1, salvo que no se haya cargado a la mamá cuando nació)
        const bebes = bebeSimilitudes.filter(pac =>
            pac.relaciones.find(rel => rel.referencia.toString() === mama._id.toString())
        );
        if (bebes.length > 0) {
            bebe = bebes[0];
        } else {
            bebe = bebeSimilitudes[0];
        }
    }
    // Buscar el parentesco asociado
    const progenitor = await ParentescoCtr.search({ nombre: '^progenitor' }, {}, userScheduler as any);
    // Incluimos a la mamá en las relaciones del bebe en caso de no estarlo
    const rela = bebe.relaciones.some(rel => rel.referencia.toString() === mama._id.toString());
    if (!bebe.relaciones?.length || !rela) {
        let mamaRelacion = {
            relacion: progenitor,
            referencia: mama._id,
            nombre: mama.nombre,
            apellido: mama.apellido,
            documento: mama.documento ? mama.documento : null,
            numeroIdentificacion: mama.numeroIdentificacion ? mama.numeroIdentificacion : null,
            foto: mama.foto ? mama.foto : null,
            fechaFallecimiento: mama.fechaFallecimiento ? mama.fechaFallecimiento : null
        };
        bebe.relaciones.push(mamaRelacion);
    }
    // Insertamos/actualizamos al bebé
    let bebeAndes: IPaciente;
    if (bebeSimilitudes.length > 0) {
        bebeAndes = await PacienteCtr.update(bebe.id, bebe, userScheduler as any);
    } else {
        bebeAndes = await PacienteCtr.create(bebe, userScheduler as any);
    }
    const hijo = await ParentescoCtr.search({ nombre: '^hijo' }, {}, userScheduler as any);
    // Incluimos al bebe en las relaciones de la mamá en caso de no estarlo
    if (!mama.relaciones?.length || !mama.relaciones.some(rel => rel.referencia === bebe.id)) {
        let bebeRelacion = {
            relacion: hijo,
            referencia: bebeAndes['id'],
            nombre: bebeAndes.nombre,
            apellido: bebeAndes.apellido,
            documento: bebeAndes.documento ? bebeAndes.documento : null,
            numeroIdentificacion: bebeAndes.numeroIdentificacion ? bebeAndes.numeroIdentificacion : null,
            fotoId: bebeAndes.fotoId ? bebeAndes.fotoId : null,
            fechaFallecimiento: bebeAndes.fechaFallecimiento ? bebeAndes.fechaFallecimiento : null
        };
        mama.relaciones?.length ? mama.relaciones.push(bebeRelacion) : mama.relaciones = [bebeRelacion];
    }

    deb('UPDATE MAMA--->', mama);
    const mamaUpdated = await PacienteCtr.update(mama.id, mama, userScheduler as any);
    await nacimientosLog.info('nacimiento-updated', { tutor: mamaUpdated.id, bebe: bebeAndes['id'] }, userScheduler);
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
            tipo: 'celular',
            valor: importedData.telefono.trim(),
            ultimaActualizacion: moment()
        });
        parsedData.bebe.contacto.push({
            tipo: 'celular',
            valor: importedData.telefono.trim(),
            ultimaActualizacion: moment()
        });
    }

    let bebe = new paciente(parsedData.bebe);
    let mama = new paciente(parsedData.mama);
    return { bebe, mama };
}

async function validarPaciente(dataPaciente) {

    const resultado: any = await validar(dataPaciente.documento, dataPaciente.sexo);
    // Actualizamos datos
    if (!resultado || !resultado.estado) {
        return dataPaciente;
    }
    dataPaciente.nombre = resultado.nombre;
    dataPaciente.apellido = resultado.apellido;
    dataPaciente.estado = resultado.estado;
    dataPaciente.fechaNacimiento = resultado.fechaNacimiento;
    dataPaciente.foto = resultado.foto;
    dataPaciente.fechaFallecimiento = resultado.fechaFallecimiento;
    dataPaciente.cuil = !dataPaciente.cuil && resultado.cuil ? resultado.cuil : '';

    //  Se completan datos FALTANTES
    if (!dataPaciente.direccion?.[0] && resultado.direccion && resultado.direccion[0]) {
        dataPaciente.direccion = resultado.direccion;
    }
    if (resultado.direccion?.[1]) {  // direccion legal
        dataPaciente.direccion[1] = resultado.direccion[1];
    }
    return dataPaciente;
}


async function procesarDataNacimientos(nacimiento) {
    let resultadoParse: any = parsearPacientes(nacimiento);
    deb('PARSER RESULT--->', resultadoParse);
    try {
        let mama = resultadoParse.mama;
        const pacientesFound = await PacienteCtr.search({ documento: resultadoParse.mama.documento, sexo: 'femenino', activo: true, }, { limit: 1 }, userScheduler as any);
        // Existe en ANDES?
        if (pacientesFound?.length > 0) {
            mama = pacientesFound[0];
        }
        if (mama.estado === 'temporal' && mama.documento && mama.documento !== '') {
            mama = await validarPaciente(mama);
            if (pacientesFound?.length > 0) {
                mama = await PacienteCtr.update(mama.id, mama, userScheduler as any);
            } else {
                mama = await PacienteCtr.create(mama, userScheduler as any);
            }
        }
        await relacionar(mama, resultadoParse.bebe);
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
export async function importarDocumentosAsignados(done) {
    try {
        // Buscamos en andes los bebes que aún no tienen documento
        let resultadoBusqueda: any = await PacienteCtr.search({ documento: '', certificadoRenaper: { $exists: true }, activo: true }, {}, userScheduler as any);
        for (let pacienteBebe of resultadoBusqueda) {
            const certificadoFechaPath = registroProvincialData.queryNacidoByCertificado + pacienteBebe.certificadoRenaper;
            let bebe = await getInfoPacientes(certificadoFechaPath);
            await updateDatosPaciente(bebe[0], pacienteBebe);
        }
    } catch (error) {
        await nacimientosLog.error('nacimiento-updated', null, error, userScheduler);
        return error;
    }
    deb('Proceso Agregar documentos Faltantes Finalizado');
    done();
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
        if (pacienteAndes.documento && pacienteAndes.documento !== '') {
            const bebeValidado = await validarPaciente(pacienteAndes);
            await PacienteCtr.update(pacienteAndes.id, bebeValidado, userScheduler as any);
        }
    }
}
