import { AuthUsers } from '../auth/schemas/authUsers';

async function run(done) {
    const match = 'internacion:mapaDeCamas';

    const organizaciones: any = AuthUsers.aggregate([
        {
            $match: {
                'organizaciones.permisos': match
            }
        },
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

        await AuthUsers.update(
            {
                _id: user._id,
                'organizaciones._id': user.organizaciones._id,
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
