import { Paciente } from '../paciente/paciente.schema';
import { PacienteCtr } from '../paciente/paciente.routes';
import { userScheduler } from '../../../config.private';

const dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

export const updateRelacionesPacientes = async (done) => {
    const cursor = Paciente.find({
        activo: true,
        'relaciones.0': { $exists: true },
        $or: [
            { 'relaciones.fechaNacimiento': { $exists: false } },
            { 'relaciones.activo': { $exists: false } }
        ]

    }).cursor({ batchSize: 100 });

    const updatePatient = async (pac: any) => {
        try {
            /* Recorremos las relaciones de este paciente. Por cada relacion obtenemos el paciente relacionado
            e iteramos dentro de sus relaciones buscando este paciente (pac) para reemplazar/actualizar varios campos */
            if (pac.relaciones?.length) {

                for (const rel of pac.relaciones) {
                    const relacionado: any = await Paciente.findById(rel.referencia); // un paciente relacionado
                    if (relacionado) {
                        await actualizarRelacion(rel, relacionado);
                        if (relacionado.relaciones && relacionado.relaciones.length > 0) {
                            const relacion = relacionado.relaciones.find(r => r.referencia.toString() === pac.id.toString());
                            await actualizarRelacion(relacion, pac);


                        }
                        await PacienteCtr.update(relacionado.id, { relaciones: relacionado.relaciones }, dataLog);
                    }
                }
                await PacienteCtr.update(pac._id, { relaciones: pac.relaciones }, dataLog);
            }
            // }
        } catch (error) {
            return;
        }
    };

    function actualizarRelacion(relacion: any, paciente: any) {
        if (relacion) {
            if (!relacion.fotoId) {
                relacion.fotoId = paciente.fotoId;
            }
            relacion.fechaNacimiento = paciente.fechaNacimiento;
            relacion.activo = paciente.activo;
            relacion.nombre = paciente.nombre;
            relacion.apellido = paciente.apellido;
            if (paciente.documento) {
                relacion.documento = paciente.documento;
            }
            if (paciente.numeroIdentificacion) {
                relacion.numeroIdentificacion = paciente.numeroIdentificacion;
            }
            if (paciente.fechaFallecimiento) {
                relacion.fechaFallecimiento = paciente.fechaFallecimiento;
            }
        }
        return relacion;
    }
    await cursor.eachAsync(async (pac: any) => {
        await updatePatient(pac);
    });
    done();
};
