import { userScheduler, geoKey } from '../../../config.private';
import { validar } from '../../../core-v2/mpi/validacion/validacion.controller';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { geoReferenciar } from '@andes/georeference';
import * as moment from 'moment';

export async function updateValidados(done) {
    const cantidad = process.env.COUNT_VALIDADO || '5';
    const limite = parseInt(cantidad, 10);
    const fechaDesde = moment().subtract(3, 'months').format('YYYY-MM-DD');
    try {
        const options = { limit: limite, sort: { updatedAt: -1 } };
        const pacientes: any = await PacienteCtr.search({ estado: 'validado', activo: true, fechaUpdate: `<${fechaDesde}` }, options as any, userScheduler as any);
        let pacientesValidados = [];

        for (const pac of pacientes) {
            pacientesValidados.push(await validar(pac.documento, pac.sexo));
        }
        let pacientes_updates = [];
        pacientes.forEach(async (paciente: any) => {
            const persona_validada = pacientesValidados.find(pac => { return pac.documento === paciente.documento && pac.sexo === paciente.sexo; });
            let data: any = {};
            if (persona_validada) {
                data.foto = persona_validada.foto;
                if (persona_validada.fechaFallecimiento) {
                    data.fechaFallecimiento = persona_validada.fechaFallecimiento;
                }
                if (paciente.direccion?.[0]) {
                    if (persona_validada.direccion?.length > 0) {
                        data.direccion[1] = persona_validada.direccion[1];
                    }
                } else {
                    // si el paciente no tiene direccion le asignamos ambas con el valor de su direccion legal
                    data.direccion = persona_validada.direccion;
                }
                if (!data.direccion[0].georeferencia || (data.direccion.length > 0 && data.direccion[0].georeferencia === null)) {
                    const dir = data.direccion[0].valor + ', ' + data.direccion[0].ubicacion.localidad.nombre + ', ' + data.direccion[0].ubicacion.provincia.nombre;
                    const geoRef: any = await geoReferenciar(dir, geoKey);
                    data.direccion[0].geoReferencia = geoRef && Object.keys(geoRef).length > 0 ? [geoRef.lat, geoRef.lng] : null;
                }
                pacientes_updates.push(PacienteCtr.update(paciente.id, data, userScheduler as any));
            }
        });
        await Promise.all(pacientes_updates);
    } catch (err) {
        return err;
    }
    done();
}
