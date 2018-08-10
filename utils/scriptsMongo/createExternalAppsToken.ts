import * as mongoose from 'mongoose';
import * as configuraciones from './../../config.private';
import { authApps }  from './../../auth/schemas/authApps';
import * as AuthClass from './../../auth/auth.class';
import * as Connections from './../../connections';


Connections.Connections.initialize();

createToken();

async function createToken() {
    let id = process.argv[2];
    let app: any = await authApps.findById(id);
    let organizacion = app.organizacion;
    let permisos = app.permisos;
    let nombre = app.nombre;

    let token = AuthClass.Auth.generateAppToken(nombre, organizacion, permisos);
    app.token = token;
    app.save().then( function() {
        process.exit();
    });
}

