import * as express from 'express';
import permisos from '../../../auth/permisos';
import { actualizarPermisosUsuario } from '../controller/permiso';
import { Auth } from '../../../auth/auth.class';
import * as config from '../../../config.private';

const router = express.Router();

router.get('/permisos', Auth.authenticate(), (req, res, next) => {
    res.send(permisos);
});

router.patch('/module/usuarios/usuario/:idUsuario/organizacion/:idOrganizacion/modulo/:modulo/permisos', Auth.authenticate(), async (req, res, next) => {
    try {
        res.json(await actualizarPermisosUsuario(
            req.params.idUsuario,
            req.params.idOrganizacion,
            req.params.modulo,
            req.body.permisos
        ));
    } catch(e) {
        res.json(e);
    }
});

function makeString(item, parent) {
    if (item.child) {
        let rs = [];
        item.child.forEach((i) => {
            rs = [...rs, ...makeString(i, parent + (parent.length > 0 ? ':' : '') + item.key)];
        });
        return rs;
    } else {
        if (item.type === 'boolean') {
            return [parent + (parent.length > 0 ? ':' : '') + item.key];
        } else {
            return [parent + (parent.length > 0 ? ':' : '') + item.key + ':<b>xxx</b>'];
        }
    }
}
if (config.enablePermisosDoc) {
    router.get('/permisos/doc', (req, res) => {
        let rs = [];
        permisos.forEach((i) => {
            rs = [...rs, ...makeString(i, '')];
        });
        let respuesta = '';
        rs.forEach(line => {
            respuesta += '' + line + '<br>';
        });
        res.send(respuesta);
    });
}
export = router;
