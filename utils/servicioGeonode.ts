import * as express from 'express';
import { geoNode } from '../config.private';

const router = express.Router();

export function getServicioGeonode(point) {
    let resultado: any;
    return new Promise(async (resolve, reject) => {
        if (point) {
            let geoRef = [Number(point[1]), Number(point[0])];

            // Se realiza la conversión de las coordenadas desde mercator a gauss-krüger mediante la lib 'proj4' (http://proj4js.org/)
            let proj4 = require('proj4');
            let fromProjection = '+title=*GPS (WGS84) (deg) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees';
            let toProjection = '+proj=tmerc +lat_0=-90 +lon_0=-69 +k=1 +x_0=2500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
            let geoRefGK = proj4(fromProjection, toProjection, geoRef); // geo-referencia en coordenadas gauss-krüger
            // Se arma un polígono con las coordenadas obtenidas
            let geoBox = (geoRefGK[0] - 10) + '%2C' + (geoRefGK[1] - 10) + '%2C' + (geoRefGK[0] + 10) + '%2C' + (geoRefGK[1] + 10);

            // Seteo de datos para realizar el request
            let user = geoNode.auth.user;
            let pass = geoNode.auth.password;
            let auth = new Buffer(user + ':' + pass).toString('base64');
            let url = encodeURI('http://geosalud.neuquen.gov.ar/geoserver/geonode/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FORMAT=image%2Fpng&TRANSPARENT=true&QUERY_LAYERS=geonode%3Abarrios&LAYERS=geonode%3Abarrios&STYLES=barrios&FORMAT_OPTIONS=antialias%3Atext&INFO_FORMAT=application/json&FEATURE_COUNT=50&X=50&Y=50&SRS=EPSG%3A22182&WIDTH=101&HEIGHT=101&BBOX=' + geoBox);
            let req = {
                uri: decodeURI(url),
                headers: { Authorization: 'Basic ' + auth, timeout: '2L' }
            };

            const request = require('request');
            const to_json = require('xmljson').to_json;

            // Se realiza el request al servicio
            try {
                await request.get(req, (err, response, body) => {
                    if (!err) {
                        to_json(body, (error, data) => {
                            if (response.statusCode === 200) {
                                if (JSON.parse(body).features.length) {
                                    return resolve(JSON.parse(body).features[0].properties.NOMBRE);
                                }
                            }
                            return resolve(null);
                        });
                    } else {
                        return resolve(null);
                    }
                });
            } catch (error) {
                return reject(error);
            }
        } else {
            resolve(null);
        }
    });
}

