import { vacunas } from '../../vacunas/schemas/vacunas';
import { Matching } from '@andes/match';
import { weightsVaccine } from '../../../config';

export async function getVacunas(paciente) {
    try {
        const conditions = {};
        conditions['documento'] = paciente.documento;
        const sort = { fechaAplicacion: -1 };

        const resultados = await vacunas.find(conditions).sort(sort);
        if (resultados.length > 0) {
            // filter en lugar de splice: borrar elementos mientras se recorre el array corre los índices
            return resultados.filter((vacuna: any) => {
                const pacienteVacuna = {
                    nombre: vacuna.nombre,
                    apellido: vacuna.apellido,
                    documento: vacuna.documento,
                    sexo: vacuna.sexo,
                    fechaNacimiento: vacuna.fechaNacimiento
                };
                const match = new Matching();
                const resultadoMatching = match.matchPersonas(paciente, pacienteVacuna, weightsVaccine, 'Levenshtein');
                if (resultadoMatching < 0.90) {
                    return false;
                } else {
                    vacuna.nombre = undefined;
                    vacuna.apellido = undefined;
                    vacuna.sexo = undefined;
                    vacuna.documento = undefined;
                    vacuna.fechaNacimiento = undefined;
                    return true;
                }
            });
        }
        return resultados;

    } catch (err) {
        return err;
    }
}

export async function getCount(paciente) {
    const cantidad = await vacunas.find({ documento: paciente.documento }).count();
    return cantidad;
}

export async function getVacuna(id) {
    const doc = await vacunas.findOne({ idvacuna: id });
    return doc;
}
export async function createVacuna(vacuna) {
    const doc = new vacunas(vacuna);
    return await doc.save();
}
