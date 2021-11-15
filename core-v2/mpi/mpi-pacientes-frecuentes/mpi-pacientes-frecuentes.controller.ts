import { MpiPacienteFrecuente } from './mpi-pacientes-frecuentes.schema';
import { IMpiPacienteFrecuente } from './mpi-pacientes-frecuentes.interface';

export function make(body: IMpiPacienteFrecuente) {
    const mpiPacienteFrecuente = new MpiPacienteFrecuente();
    mpiPacienteFrecuente.set(body);
    return mpiPacienteFrecuente;
}

export async function registerInteraction(paciente, usuario) {
    const opciones = { paciente: paciente.id, usuario: usuario.id };
    let frecuente: any = await MpiPacienteFrecuente.findOne(opciones);
    if (frecuente) {
        frecuente.ultimoAcceso = new Date();
        frecuente.cantidad = frecuente.cantidad++;
        await frecuente.save();
    } else {
        frecuente = make({
            usuario: usuario.id,
            paciente: paciente.id,
            ultimoAcceso: new Date(),
            cantidad: 1
        });
        await frecuente.save();
    }
}
