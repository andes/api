import { vacunas } from '../../vacunas/schemas/vacunas';
import { Matching } from '@andes/match';
import { weightsVaccine } from '../../../config';

export async function getVacunas(paciente) {
    try {
        const conditions = {};
        conditions['documento'] = paciente.documento;
        const sort = { fechaAplicacion: -1 };

        let resultados = await vacunas.find(conditions).sort(sort);
        if (resultados.length > 0) {
            resultados.forEach((vacuna: any, index) => {
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
                    resultados.splice(index, 1);
                } else {
                    vacuna.nombre = undefined;
                    vacuna.apellido = undefined;
                    vacuna.sexo = undefined;
                    vacuna.documento = undefined;
                    vacuna.fechaNacimiento = undefined;
                }
            });
        }
        return resultados;

    } catch (err) {
        return err;
    }
}

export async function getCount(paciente) {
    let cantidad = await vacunas.find({ documento: paciente.documento }).count();
    return cantidad;
}

export async function getVacuna(id) {
    let doc = await vacunas.findOne({ idvacuna: id });
    return doc;
}
export async function createVacuna(vacuna) {
    let doc = new vacunas(vacuna);
    return await doc.save();
}
