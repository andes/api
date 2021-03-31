import { userScheduler, geoKey } from '../../../config.private';
import { validar } from '../../../core-v2/mpi/validacion/validacion.controller';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { geoReferenciar } from '@andes/georeference';
import * as moment from 'moment';
import { extractFoto } from '../../../core-v2/mpi/paciente/paciente.controller';

export async function updateValidados(done) {
    const cantidad = process.env.COUNT_VALIDADO || '5';
    const limite = parseInt(cantidad, 10);
    const fechaDesde = moment().subtract(3, 'months').format('YYYY-MM-DD');
    try {
        const options = { limit: limite, sort: { updatedAt: -1 } };
        const pacientes: any = await PacienteCtr.search({ estado: 'validado', activo: true, fechaUpdate: `<${fechaDesde}` }, options as any, userScheduler as any);
        let persona_validada;

        for (const pac of pacientes) {
            persona_validada = await validar(pac.documento, pac.sexo);
            let data: any = {};
            if (persona_validada) {
                // data.foto = persona_validada.foto;
                await extractFoto(extractFoto, userScheduler);
                data.fotoId = persona_validada.fotoId;

                if (persona_validada.fechaFallecimiento) {
                    data.fechaFallecimiento = persona_validada.fechaFallecimiento;
                }
                data['direccion'] = pac.direccion;
                if (pac.direccion?.[0]) {
                    if (persona_validada.direccion?.length > 0) {
                        data.direccion[0] = persona_validada.direccion[0];
                    }
                } else {
                    // si el paciente no tiene direccion le asignamos ambas con el valor de su direccion legal
                    data.direccion = persona_validada.direccion;
                }
                if (data.direccion[0].ubicacion.localidad && (!data.direccion[0].georeferencia || (data.direccion.length > 0 && data.direccion[0].georeferencia === null))) {
                    const localidad = data.direccion[0].ubicacion.localidad.nombre;
                    const provincia = data.direccion[0].ubicacion.provincia.nombre;
                    const dir = `${data.direccion[0].valor}, ${localidad}, ${provincia}`;
                    const geoRef: any = await geoReferenciar(dir, geoKey);
                    data.direccion[0].geoReferencia = geoRef && Object.keys(geoRef).length > 0 ? [geoRef.lat, geoRef.lng] : null;
                }
                await PacienteCtr.update(pac.id, data, userScheduler as any);
            }
        }

    } catch (err) {
        return err;
    }
    done();
}
