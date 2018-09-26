import * as express from 'express';

const router = express.Router();

router.get('/geonode', (req, res) => {
    //   if(req.query.consulta){
    console.log('entroooo');
    //   const curl = new (require('curl-request'))();
    let user = 'admin';
    let pass = 'geonode';
    let auth = new Buffer(user + ':' + pass).toString('base64');
    let curl = require('curlrequest');

    // curl.setHeaders('Basic ' + new Buffer(user + ':' + pass).toString('base64'))
    //     .get('admin:geonode -XGET "geosalud.neuquen.gov.ar:80/geoserver/geonode/wms"')
    //     .then(({ statusCode, body, headers }) => {
    //         console.log(statusCode, body, headers);
    //         res.json(body);
    //     })
    //     .catch((e) => {
    //         console.log(e);
    //     });

    let opciones = [{
        url: 'http://geosalud.neuquen.gov.ar:80/geoserver/geonode/wms',
        headers: /* { user: 'admin', password: 'geonode' } */ { Authorization: 'Basic ' + auth },
        pretend: true
    }];
    // curl.request(opciones, (err, stdout) => {
    //     console.log('entro');
    //     if (err) {
    //         console.log('error!');
    //     } else {
    //         console.log('sin errores: ', stdout);

    //     }   // 2569799.81127677    *   5690000.22369163

    // });

    curl.request({ opciones }, (err, stdout, meta) => {
        console.log('%s %s', meta.cmd, meta.args.join(' '));
    });


}); // curl -v -u admin:geoserver -XGET "http://localhost/geoserver/rest/workspaces/topp/coveragestores/polyphemus-v1/coverages/NO2/index/granules.xml?limit=2"


export = router;
