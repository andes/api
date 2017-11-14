import * as pacienteCtr from '../../../core/mpi/controller/paciente';

/**
 * Crea un objeto paciente desde los datos
 */
function dataToPac (dataPaciente, identificador) {
    return {
        apellido: dataPaciente.apellido,
        nombre: dataPaciente.nombre,
        fechaNacimiento: dataPaciente.fechaNacimiento,
        documento: dataPaciente.documento,
        sexo: dataPaciente.sexo,
        genero: dataPaciente.sexo,
        activo: true,
        estado: 'temporal',
        identificadores: [{
            entidad: identificador,
            valor: dataPaciente.id
        }]
    };
}

/**
 * Matcheamos los datos del paciente.
 * Primero buscamos si el ID en la organización ya esta cargado.
 * Hacemos un multimatch con los datos del paciente y matcheamos los datos.
 * Seleccionamos si hay alguno arriba de 95%
 * Sino creamos un nuevo paciente
 * Cargamos el identificador de la organización de origen.
 *
 * @param {Request} req
 * @param {object} dataPaciente Datos del paciente
 * @param {string} organizacion Identificador de la organización
 */
export async function findOrCreate(req, dataPaciente, organizacion) {
    if (dataPaciente.id) {

        let identificador = {
            entidad: organizacion,
            valor: dataPaciente.id
        };

        try {

            let query = await pacienteCtr.buscarPacienteWithcondition({
                identificadores: identificador
            });

            if (query) {
                return query.paciente;
            }

        } catch (e) {
            // nothing to do here
        }
    }

    let pacientes = await pacienteCtr.matchPaciente(dataPaciente);
    if (pacientes.length > 0 && pacientes[0] >= 0.95) {
        let realPac = await pacienteCtr.buscarPaciente(pacientes[0].id);
        let paciente = realPac.paciente;

        if (!paciente.identificadores) {
            paciente.identificadores = [];
        }
        let index = paciente.identificadores.findIndex(item => item.entidad === organizacion);
        if (index < 0) {
            paciente.identificadores.push({
                entidad: organizacion,
                valor: dataPaciente.id
            });
            await pacienteCtr.updatePaciente(paciente, {identificadores: paciente.identificadores} , req);
        }
        return paciente;
    } else {
        return await pacienteCtr.createPaciente(dataToPac(dataPaciente, organizacion), req);
    }
}
