import { padronPrepagas } from '../schemas/padronPrepagas';
import { dirname } from 'path';

/**
 * @deprecated
 */
export async function pacientePrepaga(documento, sexo) {
    let rta: any = await padronPrepagas.findOne({ dni: documento, sexo }).exec();
    const resultOS = [];
    if (rta) {
        resultOS[0] = { codigoPuco: null, nombre: rta.nombre, financiador: null };
    }
    return resultOS;
}


export async function actualizarPadronPrepagas(documento, sexo, obraSocial) {
    let rta = await padronPrepagas.findOne({ dni: documento, sexo }).exec();
    let prepagas = new padronPrepagas({
        dni: documento,
        sexo,
        idObraSocial: obraSocial.idObraSocial,
        nombre: obraSocial.nombre,
        numeroAfiliado: obraSocial.numeroAfiliado,
        idPrepaga: obraSocial._id
    });
    if (!rta) {
        prepagas.save((errPatch) => {
            if (errPatch) {
                return (errPatch);
            }
            return;
        });
    } else {
        if (obraSocial.idObraSocial !== rta.idObraSocial) {
            rta.idObraSocial = obraSocial.idObraSocial;
            rta.nombre = obraSocial.nombre;
            rta.financiador = obraSocial.financiador;
            rta.idPrepaga = obraSocial._id;
            rta.numeroAfiliado = obraSocial.numeroAfiliado;
            rta.save((error) => {
                if (error) {
                    return (error);
                }
                return;
            });
        } else {
            if (obraSocial.numeroAfiliado !== rta.numeroAfiliado) {
                rta.numeroAfiliado = obraSocial.numeroAfiliado;
                rta.idPrepaga = obraSocial._id;

                rta.save((error) => {
                    if (error) {
                        return (error);
                    }
                    return;
                });
            }
        }
    }
}

export async function getPaciente(documento, sexo) {
    let rta: any = await padronPrepagas.findOne({ dni: documento, sexo }).exec();
    let resultOS;
    if (rta) {
        resultOS = { codigoPuco: null, nombre: null, financiador: rta.nombre, idObraSocial: rta.idObraSocial, prepaga: true, numeroAfiliado: rta.numeroAfiliado, id: rta.idPrepaga };
    }
    return resultOS;
}
