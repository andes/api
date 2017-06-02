import { paciente } from '../core/mpi/schemas/paciente';


// Cambiar el estado del paciente a validado y agregamos como entidad validadora a Sisa
export function validarPaciente(pacienteActualizar, entidad) {
    return new Promise((resolve, reject) => {
        pacienteActualizar.paciente.estado = 'validado';
        if (pacienteActualizar.paciente.entidadesValidadoras.indexOf(entidad) <= -1) {
            pacienteActualizar.paciente.entidadesValidadoras.push(entidad);
        }
        console.log('Paciente Actualizar: ', pacienteActualizar);
        paciente.findByIdAndUpdate(pacienteActualizar.paciente._id, pacienteActualizar.paciente, {
            new: true
        }, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve({ 'paciente': data, 'matcheos': pacienteActualizar.matcheos });
            }
        });

    })
}



// Cambiar el estado del paciente a validado y agregamos como entidad validadora a Sisa
export function validarActualizarPaciente(pacienteActualizar, entidad, datosPacEntidad) {
    return new Promise((resolve, reject) => {
        console.log('Datos a validar', datosPacEntidad);
        pacienteActualizar.paciente.estado = 'validado';
        if (pacienteActualizar.paciente.entidadesValidadoras.indexOf(entidad) <= -1) {
            pacienteActualizar.paciente.entidadesValidadoras.push(entidad);
        }
        if (datosPacEntidad.apellido) {
            pacienteActualizar.paciente.apellido = datosPacEntidad.apellido;
        }
        if (datosPacEntidad.nombre) {
            pacienteActualizar.paciente.nombre = datosPacEntidad.nombre;
        }
        if (datosPacEntidad.direccion) {
            for (let i = 0; i < datosPacEntidad.direccion.length; i++) {
                pacienteActualizar.paciente.direccion.push(datosPacEntidad.direccion[i]);
            }
        }
        console.log('Direccion Vieja: ', pacienteActualizar.paciente.direccion);
        console.log('Direccion Nueva: ', datosPacEntidad.direccion);
        paciente.findByIdAndUpdate(pacienteActualizar.paciente._id, pacienteActualizar.paciente, {
            new: true
        }, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve({ 'paciente': data, 'matcheos': pacienteActualizar.matcheos });
            }
        });

    });
}
