export default interface ISeguimientoPaciente {
    id?: string; // Virtual
    paciente: {
        id: string,
        nombre: string,
        apellido: string,
        documento: string,
        telefono: string,
        sexo: string,
        fechaNacimiento: Date,
    }; // Agregar interface de paciente
    registro: any; // Agregar interface de registros
    profesional: any; // Agregar interface de profesion
}
