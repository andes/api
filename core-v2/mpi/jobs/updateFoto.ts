import { Paciente } from '../paciente/paciente.schema';
import { PacienteCtr } from '../paciente/paciente.routes';
import { Types } from 'mongoose';
import { userScheduler } from '../../../config.private';
const ObjectId = Types.ObjectId;
let dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

export const updateFoto = async (done) => {
    const cursor = Paciente.find({ $and: [{ foto: { $exists: true } }, { foto: { $ne: null } }, { foto: { $ne: '' } }, { fotoId: { $exists: false } }] }, '+foto').cursor({ batchSize: 100 });
    const updatePatient = async (pac) => {
        try {
            if (pac.foto?.length) {
                // insertamos nuevo campo fotoId
                let fotoIdPac = new ObjectId();
                await PacienteCtr.update(pac.id, { fotoId: fotoIdPac }, dataLog);

                /* Recorremos las relaciones de este paciente. Por cada relacion obtenemos el paciente relacionado
                    e iteramos dentro de sus relaciones buscando este paciente (pac) para reemplazar el campo 'foto'
                    por el contenido del nuevo campo 'fotoId' recien seteado  */
                if (pac.relaciones) {
                    for (const rel of pac.relaciones) {
                        let relacionado: any = await Paciente.findById(rel.referencia, '+foto'); // un paciente relacionado
                        if (relacionado) {
                            if (relacionado.relaciones && relacionado.relaciones.length > 0) {
                                relacionado.relaciones.map((unaRel: any) => { return agregarFotoId(unaRel, fotoIdPac, pac.id); }); // este paciente ('pac' en su relacion opuesta)
                            }
                            await PacienteCtr.update(relacionado.id, { relaciones: relacionado.relaciones }, dataLog);
                        }
                    }
                }
            }
        } catch (error) {
            return;
        }
    };

    function agregarFotoId(relacion, idFoto, idPaciente) {
        if (relacion.referencia.toString() === idPaciente.toString()) {
            relacion.fotoId = idFoto;
        }
        return relacion;

    }
    await cursor.eachAsync(async (pac: any) => {
        await updatePatient(pac);
    });
    done();
};
