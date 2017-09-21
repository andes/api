import * as express from 'express';
import permisos from '../../../auth/permisos';
import { Auth } from '../../../auth/auth.class';
import * as config from '../../../config.private';

let router = express.Router();

router.get('/permisos', Auth.authenticate(), function (req, res, next) {
    res.send(permisos);
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
    router.get('/permisos/doc', function (req, res) {
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
