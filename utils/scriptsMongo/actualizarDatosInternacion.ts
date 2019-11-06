import { model as Ocupacion } from '../../core/tm/schemas/ocupacion';
import { listadoInternacion } from '../../modules/rup/controllers/internacion';
import { model as Cama } from '../../modules/rup/schemas/camas';
import { Auth } from '../../auth/auth.class';

export async function actualizarDatosProcess(done) {

    // Agregar los filtros necesarios
    const filtros = {
    };

    const situacionesLaborales = [
        { id: 1, nombre: 'Trabaja o está de licencia' },
        { id: 2, nombre: 'No trabaja y busca trabajo' },
        { id: 3, nombre: 'No trabaja y no busca trabajo' }
    ];

    try {
        const ocupaciones: any = await Ocupacion.find();
        const camas: any = await Cama.find();
        let internaciones: any = await listadoInternacion(filtros, null);

        for (let internacion of internaciones) {
            let informeIngreso: any = internacion.ejecucion.registros[0].valor.informeIngreso;

            // si el informe de ingreso tiene un campo 'ocupacionHabitual' pero no 'codOcupacionHabitual'
            if (informeIngreso.ocupacionHabitual && !informeIngreso.codOcupacionHabitual) {
                let codOcupacion = ocupaciones.find(oc => oc.nombre === informeIngreso.ocupacionHabitual).codigo;
                internacion.ejecucion.registros[0].valor.informeIngreso.codOcupacionHabitual = codOcupacion;
            }
            // si el informe de ingreso tiene un campo 'situacionLaboral' pero no 'codSituacionLaboral'
            if (informeIngreso.situacionLaboral && !informeIngreso.codSituacionLaboral) {
                let codSituacionLab = situacionesLaborales.find(sl => sl.nombre === informeIngreso.situacionLaboral).id;
                internacion.ejecucion.registros[0].valor.informeIngreso.codSituacionLaboral = codSituacionLab;
            }

            // se reduce la cantidad de informacion del profesional almacenada
            let datosProfesional = {
                id: informeIngreso.profesional.id,
                documento: informeIngreso.profesional.documento,
                nombre: informeIngreso.profesional.nombre,
                apellido: informeIngreso.profesional.apellido
            };
            informeIngreso.profesional = datosProfesional;
            internacion.ejecucion.registros[0].valor = JSON.parse(JSON.stringify(internacion.ejecucion.registros[0].valor));    // Sin esta mersada no reescribe el registro

            // se reduce la cantidad de informacion del paciente almacenada en el estado de la cama
            let estadoCama;
            let camaInternacion = camas.find(c => estadoCama = c.estados.find(e => e.idInternacion && e.idInternacion.toString() === internacion.id.toString()));
            if (camaInternacion) {
                let datosPaciente = {
                    _id: estadoCama.paciente._id,
                    documento: estadoCama.paciente.documento,
                    nombre: estadoCama.paciente.nombre,
                    apellido: estadoCama.paciente.apellido,
                    sexo: (estadoCama.paciente.sexo) ? estadoCama.paciente.sexo : null,
                    genero: (estadoCama.paciente.genero) ? estadoCama.paciente.genero : null,
                    fechaNacimiento: estadoCama.paciente.fechaNacimiento,
                    direccion: (estadoCama.paciente.direccion) ? estadoCama.paciente.direccion : null,
                    contactos: (estadoCama.paciente.contactos) ? estadoCama.paciente.contactos : null
                };
                estadoCama.paciente = datosPaciente;
                camaInternacion.estados = [...camaInternacion.estados];
            }

            // Se guardan los cambios realizados
            let userScheduler = {
                user: {
                    usuario: {
                        nombre: 'Andes',
                        apellido: 'ActualizarDatosInternacionJob'
                    },
                    organizacion: {
                        nombre: 'Andes'
                    }
                },
                ip: '0.0.0.0',
                connection: {
                    localAddress: '0.0.0.0'
                }
            };
            Auth.audit(internacion, (userScheduler as any));
            await internacion.save();
            Auth.audit(camaInternacion, (userScheduler as any));
            await camaInternacion.save();
        }
    } catch (err) {
        return err;
    }
    done();
}
