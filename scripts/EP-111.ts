import { FormsEpidemiologia } from '../modules/forms/forms-epidemiologia/forms-epidemiologia-schema';
import { Organizacion } from '../core/tm/schemas/organizacion';

async function run(done) {
    const fichas = FormsEpidemiologia.find({}).cursor();
    let setOrganizacion;
    for await (const ficha of fichas) {
        const seccionUsuario = ficha.secciones.find(elem => elem.name === 'Usuario');
        const idOrganizacion = seccionUsuario.fields.find(field => (Object.keys(field))[0] === 'organizacion');
        if (!idOrganizacion.organizacion.nombre) {
            // Si la organizacion de la ficha es la que esta en el createdBy me ahorro ir a buscarla a la coleccion Organización
            if (idOrganizacion.organizacion === ficha.createdBy.organizacion.id) {
                setOrganizacion = {
                    id: ficha.createdBy.organizacion.id,
                    nombre: ficha.createdBy.organizacion.nombre
                };
                await updateFicha(ficha, setOrganizacion);
            } else {
                const organizacion: any = await Organizacion.findById(idOrganizacion.organizacion);
                setOrganizacion = {
                    id: organizacion.id,
                    nombre: organizacion.nombre
                };
                await updateFicha(ficha, setOrganizacion);
            }
        }
    }
    done();
}

async function updateFicha(ficha, organizacion) {
    await FormsEpidemiologia.update(
        { _id: ficha.id },
        {
            $set: { 'secciones.0.fields.0.organizacion': organizacion }
        },
    );
}

export = run;
