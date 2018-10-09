import * as express from 'express';
import { nextTick } from 'async';

const router = express.Router();

router.get('/geonode', (req, res) => {
    // console.log('query: ', req.query.point);
    if (req.query.point) {
        const curl = new (require('curl-request'))();
        let user = 'admin';
        let pass = 'geonode';
        let auth = new Buffer(user + ':' + pass).toString('base64');
        let fc = [2575161.89379, 5696513.34145];    // factor de corrección entre point de google y layer de geonode
        let dp = 963.93719;   // distancia aceptada por la layer para delimitar un polígono
        let geoRef = [Number(req.query.point[0]) + fc[0], Number(req.query.point[1]) + fc[1]];
        // console.log('lat: ', geoRef[0]);
        // console.log('lng: ', geoRef[1]);
        let geoBox = (geoRef[0] - dp) + '%2C' + (geoRef[1] - dp) + '%2C' + (geoRef[0] + dp) + '%2C' + (geoRef[1] + dp);
        let url = encodeURI('http://geosalud.neuquen.gov.ar/geoserver/geonode/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FORMAT=image%2Fpng&TRANSPARENT=true&QUERY_LAYERS=geonode%3Abarrios&LAYERS=geonode%3Abarrios&STYLES=barrios&FORMAT_OPTIONS=antialias%3Atext&INFO_FORMAT=application/json&FEATURE_COUNT=50&X=50&Y=50&SRS=EPSG%3A22182&WIDTH=101&HEIGHT=101&BBOX=' + geoBox);

        curl.setHeaders(['Authorization: Basic ' + auth])
            .get(decodeURI(url))
            .then(({ statusCode, body, headers }) => {
                console.log(geoBox);
                res.json(JSON.parse(body).features[0].properties.NOMBRE);     // -38.9499593 (2584663.97094) -68.0226571 (5688563.20981) |
            })                                                                // -38.9195472 (+2579200,8133372) -68.08712434 (+5692081,4131369) | 2579161.89379 5692013.34145
            .catch((e) => {
                return e;
            });
    }
});
// Point de ej. en layer: (2578579.71390, 5686685.44107) | 2577615.776704708  5685721.5038770735  2579543.6510929214  5687649.378265288  MILITAR
// Point de ej. en layer: 2580507.58829, 5690025.81749 alta barda
// fc  2579161.89379, 5692013.34145
export = router;
