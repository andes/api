import { Paciente } from '../core-v2/mpi/paciente/paciente.schema';
import { userScheduler } from '../config.private';
import { PacienteCtr } from '../core-v2/mpi/paciente/paciente.routes';
import { ParentescoCtr } from '../core-v2/mpi/parentesco/parentesco.routes';

const dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;


async function run(done) {
    const progenitor = await ParentescoCtr.findOne({ nombre: '^progenitor' }, {}, userScheduler as any);
    const hijo = await ParentescoCtr.findOne({ nombre: '^hijo' }, {}, userScheduler as any);
    const otro = await ParentescoCtr.findOne({ nombre: '^otro' }, {}, userScheduler as any);
    const cursor = Paciente.find({
        $and: [
            { 'relaciones.relacion': null },
            { 'relaciones.0': { $exists: true } }
        ]
    }).cursor({ batchSize: 100 });

    const updateRelacion = async (paciente: any) => {
        try {
            const relaciones = paciente.relaciones.map(async (unaRel: any, posRelBebe: any) => {

                let parentezcoRelacion = null;
                if (!unaRel.relacion && unaRel.referencia) {
                    // si no tiene una relacion asociada
                    // creamos la relacion hijo/otro para el familiar relacionado
                    const pacParentezco = await PacienteCtr.findById(unaRel.referencia);

                    if (pacParentezco) {
                        const hijoRelacion: any = {
                            relacion: paciente.certificadoRenaper ? hijo : otro,
                            referencia: paciente._id,
                            nombre: paciente.nombre,
                            apellido: paciente.apellido,
                            documento: paciente.documento ? paciente.documento : null,
                            fotoId: paciente.fotoId ? paciente.fotoId : null,
                            fechaFallecimiento: paciente.fechaFallecimiento ? paciente.fechaFallecimiento : null
                        };

                        if (pacParentezco.relaciones?.length) {
                            const indexRelProg = pacParentezco.relaciones.findIndex(r => r.referencia.toString() === paciente.id.toString());
                            if (indexRelProg > -1) {
                                pacParentezco.relaciones[indexRelProg] = hijoRelacion;
                            } else {
                                pacParentezco.relaciones.push(hijoRelacion);
                            }
                        } else {
                            pacParentezco.relaciones = [hijoRelacion];
                        }
                        await PacienteCtr.update(pacParentezco.id, pacParentezco, dataLog);

                        // creamos la relación progenitor/otro para el paciente
                        parentezcoRelacion = {
                            relacion: paciente.certificadoRenaper ? progenitor : otro,
                            referencia: pacParentezco._id,
                            nombre: pacParentezco.nombre,
                            apellido: pacParentezco.apellido,
                            documento: pacParentezco.documento || null,
                            numeroIdentificacion: pacParentezco.numeroIdentificacion || null,
                            fotoId: pacParentezco.fotoId || null,
                            fechaFallecimiento: pacParentezco.fechaFallecimiento || null
                        };

                        return parentezcoRelacion;
                    }
                }
                if (!parentezcoRelacion) { return unaRel; }


            });
            const relacionesBebe = await Promise.all(relaciones);
            paciente.relaciones = relacionesBebe;
            await PacienteCtr.update(paciente.id, paciente, dataLog);
        } catch (error) {
            return;
        }
    };

    await cursor.eachAsync(async (paciente: any) => {
        await updateRelacion(paciente);
    });
    done();
}

export = run;
