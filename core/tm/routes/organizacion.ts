import * as express from 'express';
import * as https from 'https';
import { Organizacion } from '../schemas/organizacion';
import * as utils from '../../../utils/utils';
import { toArray } from '../../../utils/utils';
import * as configPrivate from '../../../config.private';
import { Auth } from '../../../auth/auth.class';
import { validarOrganizacionSisa, obtenerOfertaPrestacional } from '../controller/organizacion';
const GeoJSON = require('geojson');
const router = express.Router();


router.get('/organizaciones/georef/:id?', async (req, res, next) => {
    if (req.params.id) {
        Organizacion
            .findById(req.params.id, (err, data: any) => {
                if (err) {
                    return next(err);
                }
                const dir = data.direccion.valor;
                const localidad = data.direccion.ubicacion.localidad.nombre;
                const provincia = data.direccion.ubicacion.provincia.nombre;
                // let pais = organizacion.direccion.ubicacion.pais;
                let pathGoogleApi = '';
                let jsonGoogle = '';
                pathGoogleApi = `/maps/api/geocode/json?address=${dir}${localidad}${provincia}AR&key=${configPrivate.geoKey}`;

                pathGoogleApi = pathGoogleApi.replace(/ /g, '+');
                pathGoogleApi = pathGoogleApi.replace(/á/gi, 'a');
                pathGoogleApi = pathGoogleApi.replace(/é/gi, 'e');
                pathGoogleApi = pathGoogleApi.replace(/í/gi, 'i');
                pathGoogleApi = pathGoogleApi.replace(/ó/gi, 'o');
                pathGoogleApi = pathGoogleApi.replace(/ú/gi, 'u');
                pathGoogleApi = pathGoogleApi.replace(/ü/gi, 'u');
                pathGoogleApi = pathGoogleApi.replace(/ñ/gi, 'n');

                const optionsgetmsg = {
                    host: 'maps.googleapis.com',
                    port: 443,
                    path: pathGoogleApi,
                    method: 'GET',
                    rejectUnauthorized: false
                };

                if (dir !== '' && localidad !== '' && provincia !== '') {
                    const reqGet = https.request(optionsgetmsg, (res2) => {
                        res2
                            .on('data', (d, error) => {
                                jsonGoogle = jsonGoogle + d.toString();
                            });

                        res2.on('end', () => {
                            const salida = JSON.parse(jsonGoogle);
                            if (salida.status === 'OK') {
                                res.json(salida.results[0].geometry.location);
                            } else {
                                res.json('');
                            }
                        });
                    });
                    req.on('error', (e) => {
                        return next(e);
                    });
                    reqGet.end();
                } else {
                    return next('Datos de dirección incompletos');
                }
            });

    } else {
        const query = Organizacion.aggregate([
            {
                $match: {
                    'direccion.geoReferencia': {
                        $exists: true
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    nombre: '$nombre',
                    lat: {
                        $arrayElemAt: ['$direccion.geoReferencia', 0]
                    },
                    lng: {
                        $arrayElemAt: ['$direccion.geoReferencia', 1]
                    }
                }
            }
        ])
            .cursor({})
            .exec();

        const data = await toArray(query);
        const geoJsonData = GeoJSON.parse(data, {
            Point: [
                'lat', 'lng'
            ],
            include: ['nombre']
        });
        res.json(geoJsonData);
    }
});
/*
* Dado el código sisa de un efector, devuelve sus datos en sisa, incluido su ofertaPrestacional
*/
router.get('/organizaciones/sisa/:id', async (req, res, next) => {
    try {
        const [requestSisa, requestOfertaPrestacional] = await Promise.all([validarOrganizacionSisa(req.params.id), obtenerOfertaPrestacional(req.params.id)]);
        const { statusSisa, bodySisa } = requestSisa;
        const { statusOferta, bodyOferta } = requestOfertaPrestacional;
        if (statusSisa === 200) {
            if (statusOferta === 200) {
                let prestaciones = [];
                if (bodyOferta && bodyOferta.prestaciones && bodyOferta.prestaciones.length) { // valido mucho porque viene de SISA, podría cambiar la estructura y no queremos que pinche
                    bodyOferta.prestaciones.forEach((prest: { id: Number, disponible: String, nombre: String }) => {
                        if (prest.disponible === 'SI') {
                            prestaciones.push({ idSisa: prest.id, nombre: prest.nombre });
                        }
                    });
                }
                bodySisa['ofertaPrestacional'] = prestaciones;
            }
            res.json(bodySisa);
        }
    } catch (err) {
        return next(err);
    }
});
router.get('/organizaciones/:id', async (req, res, next) => {
    try {
        let org = await Organizacion.findById(req.params.id);
        res.json(org);
    } catch (err) {
        return next(err);
    }
});

router.get('/organizaciones', async (req, res, next) => {
    const filtros = {};
    if (req.query.nombre) {
        filtros['nombre'] = {
            $regex: utils.makePattern(req.query.nombre)
        };
    }

    if (req.query.cuie) {
        filtros['codigo.cuie'] = req.query.cuie;
    }

    if (req.query.sisa) {
        filtros['codigo.sisa'] = req.query.sisa;
    }
    filtros['activo'] = req.query.activo !== null && req.query.activo !== undefined ? req.query.activo : true;
    if (req.query.tipoEstablecimiento) {
        filtros['tipoEstablecimiento.nombre'] = {
            $regex: utils.makePattern(req.query.tipoEstablecimiento)
        };
    }
    if (req.query.ids) {
        filtros['_id'] = { $in: req.query.ids };
    }
    const query = Organizacion.find(filtros);
    if (req.query.fields) {
        query.select(req.query.fields);
    }
    try {
        const organizaciones: any = await query.exec();
        delete organizaciones.configuraciones;
        return res.json(organizaciones);
    } catch (err) {
        return next(err);
    }
});

/**
 * GET /organizaciones/:id/configuracion
 * Devuelve las configuraciones de una organizacion.
 *
 *
 */
router.get('/organizaciones/:id/configuracion', async (req, res, next) => {
    try {
        const id = req.params.id;
        const org: any = await Organizacion.findById(id, { configuraciones: 1 });
        return res.json(org.configuraciones);
    } catch (error) {
        return next(error);
    }
});

router.post('/organizaciones', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'tm:organizacion:create')) {
        return next(403);
    }
    try {
        const newOrganization = new Organizacion(req.body);
        Auth.audit(newOrganization, req);
        await newOrganization.save();
        return res.json(newOrganization);
    } catch (err) {
        return next(err);
    }
});

router.put('/organizaciones/:id', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'tm:organizacion:edit')) {
        return next(403);
    }
    try {
        let org = await Organizacion.findByIdAndUpdate(req.params.id, req.body);
        return res.json(org);
    } catch (err) {
        return next(err);
    }
});

router.delete('/organizaciones/:id', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'tm:organizacion:delete')) {
        return next(403);
    }
    try {
        let org = await Organizacion.findByIdAndRemove(req.params._id);
        return res.json(org);
    } catch (err) {
        return next(err);
    }
});


export = router;
