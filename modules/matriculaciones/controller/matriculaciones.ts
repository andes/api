import numeracionMatriculas = require('../../../modules/matriculaciones/schemas/numeracionMatriculas');

export const query = { 'profesion.nombre': 'Especialidades' };

export async function ultimoPosgrado() {
    const data: any = await numeracionMatriculas.findOne(query);
    let ultimoNumero = 0;
    if (data) {
        ultimoNumero = data.proximoNumero;
    }
    return ultimoNumero;
}
