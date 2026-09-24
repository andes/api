import { MotivosHuds } from './motivosHuds.schema';

export { MotivosHudsRouter } from './motivosHuds.routes';

export async function setUpMotivosHuds() {
    await MotivosHuds.updateOne(
        { key: 'exportacion-huds' },
        {
            $set: {
                label: 'Exportación de HUDS',
                key: 'exportacion-huds',
                moduloDefault: ['exportar-huds'],
                descripcion: 'Motivo utilizado por defecto para la exportación de HUDS',
                activo: true
            }
        },
        { upsert: true }
    );
}
