import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { getOrganizacionAreaByLocationPoint } from './../../../modules/georeferencia/controller/areasPrograma';

export async function getOrganizacionSeguimiento(ficha) {
    const patientGeoRef = (ficha.paciente.direccion && ficha.paciente.direccion[0]?.geoReferencia?.length) ? ficha.paciente.direccion[0].geoReferencia.reverse() : null;

    let coordinates;

    if (patientGeoRef) {
        coordinates = patientGeoRef;
    } else {
        const organizacionCreatedBy = await Organizacion.findById(ficha.createdBy.organizacion.id);
        coordinates = organizacionCreatedBy.direccion?.geoReferencia?.reverse();
    }

    let organizacionSeguimiento;
    if (coordinates) {
        organizacionSeguimiento = await getOrganizacionAreaByLocationPoint({ type: 'Point', coordinates });
    } else {
        const organizacionDefecto = await Organizacion.findOne({ defaultSeguimiento: true });
        organizacionSeguimiento = {
            id: organizacionDefecto._id,
            nombre: organizacionDefecto.nombre,
            codigoSisa: organizacionDefecto.codigo.sisa.toString()
        };
    }

    return organizacionSeguimiento;
}
