import { userScheduler } from '../config.private';
import { Profesional } from '../core/tm/schemas/profesional';
import * as provincia from '../core/tm/schemas/provincia_model';
import * as localidad from '../core/tm/schemas/localidad';
import { Auth } from '../auth/auth.class';

/*  Corrige domicilios de profesional con valor null y ubicaciones sin ids o ids erroneos
    Aclaración: Se asume que el domicilio legal existe y está completo (Ya que no debería faltar en ningun caso. Chequeado en DB al 09/23)
*/
async function run(done) {
    const provincias = await provincia.find();
    const cursor = Profesional.find({ profesionalMatriculado: true }).cursor({ batchSize: 100 });
    const update = async (profesional) => {
        try {
            let hadChanges = false;
            // domicilios
            for await (const domicilio of profesional.domicilios) { // real, profesional
                if (domicilio.tipo === 'legal') {
                    continue;
                }
                // campo 'valor' null
                if (!domicilio.valor) {
                    domicilio.valor = '';
                    hadChanges = true;
                }
                if (!domicilio.codigoPostal) {
                    domicilio.codigoPostal = '';
                    hadChanges = true;
                }
                // existe nombre de provincia (puede no existir _id o ser incorrecto)
                if (domicilio.ubicacion.provincia?.nombre?.length) {
                    // parchamos con id correspondiente segun coleccion 'provincia' ya que existen errores
                    domicilio.ubicacion.provincia = provincias.find((prov: any) => prov.nombre.toLowerCase() === domicilio.ubicacion.provincia.nombre.toLowerCase()) || null;
                    hadChanges = true;
                } else {
                    domicilio.ubicacion.provincia = null;
                    hadChanges = true;
                }
                // provincia null
                if (!domicilio.ubicacion.provincia) {
                    domicilio.ubicacion.localidad = null;
                    hadChanges = true;
                }
                // existe nombre de localidad (puede no existir _id o ser incorrecto)
                if (domicilio.ubicacion.provincia && domicilio.ubicacion.localidad?.nombre?.length) {
                    const locRegex = new RegExp(domicilio.ubicacion.localidad.nombre, 'i');
                    const locFound = await localidad.find({ nombre: locRegex, 'provincia._id': domicilio.ubicacion.provincia.id });
                    domicilio.ubicacion.localidad = locFound[0] || null;
                    hadChanges = true;
                } else {
                    domicilio.ubicacion.localidad = null;
                    hadChanges = true;
                }
            }
            // formacion grado (matriculado y papelesVerificados)
            profesional.formacionGrado.forEach(formacion => {
                const cantValidaciones = formacion.matriculacion?.length;
                /*  Controlamos que la ultima validación tenga numero de matricula. Ya que puede ser que esté en proceso de renovación
                    y aún no tenga los papeles verificados */
                if (cantValidaciones && formacion.matriculacion[cantValidaciones - 1].matriculaNumero) {
                    formacion.matriculado = true;
                    formacion.papelesVerificados = true;
                    hadChanges = true;
                }
            });

            if (hadChanges) {
                Auth.audit(profesional, (userScheduler as any));
                await profesional.save();
            }
        } catch (error) {
            return;
        }
    };
    await cursor.eachAsync(async (prof) => {
        await update(prof);
    });
    done();
}

export = run;
