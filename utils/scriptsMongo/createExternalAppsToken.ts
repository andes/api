import { authApps } from './../../auth/schemas/authApps';
import * as AuthClass from './../../auth/auth.class';
import * as Connections from './../../connections';


Connections.Connections.initialize();

createToken();

async function createToken() {
    const id = process.argv[2];
    const app: any = await authApps.findById(id);
    const organizacion = {
        id: app.organizacion,
        nombre: app.nombre
    };
    const permisos = app.permisos;

    const token = AuthClass.Auth.generateAppToken(app, organizacion, permisos);
    app.token = token;
    app.save().then(() => {
        process.exit();
    });
}

