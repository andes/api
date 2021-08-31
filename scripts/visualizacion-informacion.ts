import { AuthUsers } from '../auth/schemas/authUsers';
import { Modulos } from '../core/tm/schemas/modulos.schema';

async function run(done) {
    // Elimino los modulos
    await Modulos.remove({ nombre: 'DASHBOARD' });
    await Modulos.remove({ nombre: 'Reportes' });

    // Inserto nuevo modulo
    await Modulos.insertMany({
        permisos: [
            'visualizacionInformacion:?'
        ],
        activo: true,
        nombre: 'VISUALIZACIÓN DE INFORMACIÓN',
        descripcion: 'Permite gestionar la visualizacion de salida de informacion',
        subtitulo: 'Gestión de la informacion',
        color: '#07049f',
        icono: 'mdi-file-chart',
        linkAcceso: '/visualizacion-informacion',
        orden: 12,
        __v: 0
    });

    // Actualizo los permisos
    const organizaciones: any = AuthUsers.aggregate([
        {
            $project: {
                organizaciones: 1,
                id: '$_id'
            }
        },
        {
            $unwind: '$organizaciones'
        }
    ]);
    for await (const user of organizaciones) {
        const match = user.organizaciones.permisos.find(value => /^reportes/.test(value));
        const match2 = user.organizaciones.permisos.find(value => /^dashboard/.test(value));
        if (match) {
            await AuthUsers.update(
                { _id: user._id, 'organizaciones._id': user.organizaciones._id, 'organizaciones.permisos': match },
                {
                    $set: {
                        'organizaciones.$[].permisos.$[element]': 'visualizacionInformacion:' + match
                    }
                },
                { arrayFilters: [{ element: match }] }
            );
        }
        if (match2) {
            await AuthUsers.update(
                { _id: user._id, 'organizaciones._id': user.organizaciones._id, 'organizaciones.permisos': match2 },
                {
                    $set: {
                        'organizaciones.$[].permisos.$[element]': 'visualizacionInformacion:' + match2
                    }
                },
                { arrayFilters: [{ element: match2 }] }
            );
        }

    }
    done();
}

export = run;
