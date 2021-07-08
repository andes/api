import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { GeoSaludLayer } from '../../../utils/geoJson/geoSalud-layers.schema';
import { handleHttpRequest } from '../../../utils/requestHandler';
import { AreaPrograma } from '../areaPrograma.schema';

export async function importAreasProgramaGeoSalud() {

    const records: any = await GeoSaludLayer.find();
    const promises = records.map(e => {
        const url = e.URL;
        const options = {
            url,
            method: 'GET',
            json: true,
        };
        return handleHttpRequest(options);
    });
    const results = await Promise.all(promises);
    const zonasFeatures = results
        .map(e => e[1])
        .map(geoJson => geoJson.features);

    let features = [];
    zonasFeatures.forEach(m => features = [...features, ...m]);
    await AreaPrograma.remove({});

    return await Promise.all(features.map(a => {
        const areaDto = {
            nombre: a.properties.Name,
            sisaOrganizacion: a.properties.codigoSISA,
            geometry: a.geometry
        };
        return new AreaPrograma(areaDto).save();
    }));
}

export async function getOrganizacionAreaByLocationPoint(location) {
    const areaPrograma: any = await AreaPrograma.findOne({
        geometry: { $geoIntersects: { $geometry: location } }
    });
    // Ojo que no esta viniendo el codigo sisa aca!!!
    const sisa = areaPrograma?.sisaOrganizacion;
    if (sisa) {
        const org = await Organizacion.findOne({ 'codigo.sisa': sisa });
        return {
            id: org._id,
            nombre: org.nombre,
            codigoSisa: org.codigo.sisa.toString()
        };
    }

    return null;
}
