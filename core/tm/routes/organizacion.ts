import * as express from 'express';
import * as https from 'https';
import { Organizacion } from '../schemas/organizacion';
import * as utils from '../../../utils/utils';
import { toArray } from '../../../utils/utils';
import * as configPrivate from '../../../config.private';
import { Auth } from '../../../auth/auth.class';
import { AuthUsers } from '../../../auth/schemas/authUsers';
import * as CamasController from '../../../modules/rup/internacion/camas.controller';
import { validarOrganizacionSisa, obtenerOfertaPrestacional, addSector, changeSector, deleteSector } from '../controller/organizacion';
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
        return res.json(org.configuraciones || {});
    } catch (error) {
        return next(error);
    }
});

router.post('/organizaciones', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'tm:organizacion:create')) {
        return next(403);
    }
    try {
        const newOrganization: any = new Organizacion(req.body);
        Auth.audit(newOrganization, req);
        await newOrganization.save();

        // Al crearse una nueva organizacion, se le asigna al usuario que la creo
        let user: any = await AuthUsers.findById(req.user.usuario.id).exec();
        user.organizaciones.push({
            _id: newOrganization.id,
            nombre: newOrganization.nombre,
            permisos: [],
            activo: true,
            perfiles: []
        });
        Auth.audit(user, req);
        await user.save();

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

/****************
*** SECTORES  ***
*****************/
router.get('/organizaciones/:id/sectores', async (req, res, next) => {
    try {
        const id = req.params.id;
        const org: any = await Organizacion.findById(id, { mapaSectores: 1 });
        return res.json(org.mapaSectores || []);
    } catch (error) {
        return next(error);
    }
});

router.post('/organizaciones/:id/sectores', async (req, res, next) => {
    try {
        const id = req.params.id;
        const sector = req.body.sector;
        const padre = req.body.padre;
        const org: any = await Organizacion.findById(id, { mapaSectores: 1, unidadesOrganizativas: 1 });

        if (padre) {
            let newMap = [];
            for (const itemSector of org.mapaSectores) {
                newMap.push(addSector(itemSector, sector, padre));
            }
            org.mapaSectores = newMap;
        } else {
            org.mapaSectores.push(sector);
        }

        // Si no existe la UO, la inserto en la lista de UO de la organizacion
        if (sector.unidadConcept) {
            if (!org.unidadesOrganizativas.some(uo => uo.conceptId === sector.unidadConcept.conceptId)) {
                org.unidadesOrganizativas.push(sector.unidadConcept);
            }
        }

        await Organizacion.findByIdAndUpdate(id, org);

        // Si se edita un sector ya creado, llama al controlador de camas para que revise los sectores de las mismas
        if (req.body.edit) {
            await CamasController.sectorChange(id, sector);
        }

        return res.json(org.mapaSectores);
    } catch (error) {
        return next(error);
    }
});

router.patch('/organizaciones/:id/sectores/:idSector', async (req, res, next) => {
    try {
        const id = req.params.id;
        const idSector = req.params.idSector;
        const sector = req.body.sector;
        const org: any = await Organizacion.findById(id, { mapaSectores: 1, unidadesOrganizativas: 1 });

        let newMap = [];
        for (const itemSector of org.mapaSectores) {
            newMap.push(changeSector(itemSector, sector));
        }
        org.mapaSectores = newMap;

        // Si no existe la UO, la inserto en la lista de UO de la organizacion
        if (sector.unidadConcept) {
            if (!org.unidadesOrganizativas.some(uo => uo.conceptId === sector.unidadConcept.conceptId)) {
                org.unidadesOrganizativas.push(sector.unidadConcept);
            }
        }

        await Organizacion.findByIdAndUpdate(id, org);

        await CamasController.sectorChange(id, sector);

        return res.json(org.mapaSectores);
    } catch (error) {
        return next(error);
    }
});

router.delete('/organizaciones/:id/sectores/:idSector', async (req, res, next) => {
    try {
        const id = req.params.id;
        const idSector = req.params.idSector;

        const canDelete = await CamasController.checkSectorDelete(id, idSector);
        if (canDelete) {
            const org: any = await Organizacion.findById(id, { mapaSectores: 1 });
            let newMap = [];
            for (const itemSector of org.mapaSectores) {
                const item = deleteSector(itemSector, { _id: idSector});
                if (item) {
                    newMap.push(item);
                }
            }
            org.mapaSectores = newMap;
            await Organizacion.findByIdAndUpdate(id, org);
            return res.json(idSector);
        } else {
            return next('No se puede eliminar este sector porque tiene camas activas.');
        }
    } catch (error) {
        return next(error);
    }
});

export = router;
