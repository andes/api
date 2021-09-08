import { AuthUsers } from '../auth/schemas/authUsers';

async function run(done) {


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
        const match = 'internacion:mapaDeCamas';
        await AuthUsers.update(
            {
                _id: user._id,
                'organizaciones._id': user.organizaciones._id,
                'organizaciones.permisos': match
            },
            {
                $addToSet: { 'organizaciones.$[organizacion].permisos': 'internacion:registros' }
            },
            {
                arrayFilters: [{ 'organizacion.permisos': match }],
                multi: true
            }
        );
    }


    done();

}

export = run;
