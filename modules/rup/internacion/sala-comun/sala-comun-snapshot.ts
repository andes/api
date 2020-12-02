/**
 * Cada cierto tienpo realiza la query de snapshots
 * y deja precalculado la ocupación de la sala en un determinado momento
 */
import { SalaComunCtr } from './sala-comun.routes';
import { SalaComunMovimientos } from './sala-comun-movimientos.schema';
import { listarSalaComun } from './sala-comun.controller';
import { SalaComunSnapshot, SalaComun } from './sala-comun.schema';

export async function createSnapshotSalaComun(fecha: Date) {

    // const salas = await SalaComunCtr.search({}, { fields: '+lastSync' }, {} as any);
    const salas: any = SalaComun.find().select('+lastSync');

    for await (const sala of salas) {
        const hayMovimientos = await SalaComunMovimientos.find({
            idSalaComun: sala.id,
            fecha: { $lte: fecha, $gte: sala.lastSync }
        }).count();

        if (hayMovimientos > 0) {
            const ocupacion = await listarSalaComun({
                id: sala.id,
                fecha
            });

            const { id, nombre, organizacion, capacidad, ambito, estado, sectores, unidadOrganizativas } = sala;
            const snapshot = new SalaComunSnapshot({
                idSalaComun: id,
                fecha,
                nombre,
                organizacion,
                capacidad,
                ambito,
                estado,
                sectores,
                unidadOrganizativas,
                ocupacion: ocupacion.filter(item => item.paciente && item.idInternacion).map(o => ({
                    paciente: o.paciente,
                    ambito: o.ambito,
                    idInternacion: o.idInternacion,
                    desde: o.fecha,
                    unidadOrganizativas: o.unidadOrganizativas,
                    extras: o.extras,
                    createdAt: o.createdAt,
                    createdBy: o.createdBy,
                    updatedAt: o.updatedAt,
                    updatedBy: o.updatedBy
                }))
            });

            await snapshot.save();
            await SalaComun.update(
                { _id: sala.id },
                { $set: { lastSync: fecha } }
            );
        }

    }

}
