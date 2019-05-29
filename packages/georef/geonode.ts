import * as proj4 from 'proj4';
import { geoNode } from '../../config.private';
import { requestHttp } from './request';
import { Coordenadas } from './index';


// Se realiza la conversión de las coordenadas desde mercator a gauss-krüger mediante la lib 'proj4' (http://proj4js.org/)
// let fromProjection = '+title=*GPS (WGS84) (deg) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees';
// let toProjection = '+proj=tmerc +lat_0=-90 +lon_0=-69 +k=1 +x_0=2500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
proj4.defs('GOOGLE', '+title=*GPS (WGS84) (deg) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees');
proj4.defs('GAUSSKRUGGER', '+proj=tmerc +lat_0=-90 +lon_0=-69 +k=1 +x_0=2500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

/**
 * Servicio básico de GeoNode
 * [TODO] Parametrizar para usar mas servicios
 * [TODO] Aprender la API de Geonode para mejorar la parametrización de esta funcion
 */

export const geonode = async (point: Coordenadas): Promise<any> => {
    if (point) {
        const geoRef = [Number(point.lng), Number(point.lat)];
        const geoRefGK = proj4('GOOGLE', 'GAUSSKRUGGER', geoRef); // geo-referencia en coordenadas gauss-krüger
        const geoBox = (geoRefGK[0] - 10) + ',' + (geoRefGK[1] - 10) + ',' + (geoRefGK[0] + 10) + ',' + (geoRefGK[1] + 10);

        const auth = Buffer.from(`${geoNode.auth.user}:${geoNode.auth.password}`).toString('base64');
        const req = {
            url: `${geoNode.host}/geoserver/geonode/wms`,
            qs: {
                SERVICE: 'WMS',
                VERSION: '1.1.1',
                REQUEST: 'GetFeatureInfo',
                FORMAT: 'image/png',
                TRANSPARENT: 'true',
                QUERY_LAYERS: 'geonode:barrios',
                LAYERS: 'geonode:barrios',
                STYLES: 'barrios',
                FORMAT_OPTIONS: 'antialias:text',
                INFO_FORMAT: 'application/json',
                FEATURE_COUNT: '50',
                X: '50',
                Y: '50',
                SRS: 'EPSG:22182',
                WIDTH: '101',
                HEIGHT: '101',
                BBOX: geoBox
            },
            headers: {
                Authorization: `Basic ${auth}`,
                timeout: '2L'
            },
            json: true
        };

        try {
            const [status, body] = await requestHttp(req);
            if (status === 200) {
                return body;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
};


/**
 * Dado un punto en el mapa devuelve el barrio correspondiente
 * [TODO] esta funcion debería setar las opciones de geonode para solo consultar barrios
 */

export async function getBarrio(point: Coordenadas) {
    let response = await geonode(point);
    if (response.features.length) {
        return response.features[0].properties.NOMBRE;
    }
    return null;
}
