
import { AuthUsers } from '../auth/schemas/authUsers';


/**
 *
 * Script para incluir en los registros de authUsers los campos faltantes que figuran en el schema de authUser pero no en los primeros.
 * Para relevar los campos de los registros que están por fuera del schema, correr:
 *
 * $ git clone https://github.com/variety/variety
 * $ cd variety
 * $ npm i
 * $ mongo andes --eval "var collection = 'authUsers'" variety.js
 *
 */

async function run(done) {
    const fields = [
        'nombre',
        'activo',
        'usuario',
        'apellido',
        'documento',
        'password',
        'foto',
        'authMethod',
        'permisosGlobales',
        'organizaciones',
        'lastLogin',
        'tipo',
        'validacionToken',
        'email',
        'configuracion',
        'disclaimers'
    ];

    const usuarios = AuthUsers.find({
        $nor: [{
            $jsonSchema: {
                required: fields
            }
        }]
    }).cursor({ batchSize: 100 });

    let usuario;
    while (usuario = await usuarios.next()) {
        let missingFields = fields.filter(x => !Object.keys(usuario._doc).includes(x));
        let insertFields = {};
        missingFields.forEach(e => insertFields[e] = null);
        fields.forEach(e => {
            if (!usuario[e]) {
                usuario[e] = null;
            }
        });
        await AuthUsers.update(
            { _id: usuario._id },
            { $set: insertFields }
        );

    }
    done();
}

export = run;
