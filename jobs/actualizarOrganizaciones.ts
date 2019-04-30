import { Organizacion } from '../core/tm/schemas/organizacion';
import { validarOrganizacionSisa, obtenerOfertaPrestacional } from '../core/tm/controller/organizacion';
import debug = require('debug');

const deb = debug('nacimientosJob');

/*
* Función que carga en DB las ofertas prestacionales traidos de SISA de los efectores que se muestran en el mapa de salud de la app mobile.
* Ejecutarlas con postman, no se utiliza en ningún lado
*/
export async function actualizarOfertasPrestacionales() {
    try {
        let organizaciones: any[] = await Organizacion.find({ showMapa: true, ofertaPrestacional: { $exists: false } });
        for (let i = 0; i < organizaciones.length; i++) {
            let ofertaPrestacional = await obtenerOfertaPrestacional(organizaciones[i].codigo.sisa);
            if (ofertaPrestacional && ofertaPrestacional[0] === 200 && ofertaPrestacional[1].prestaciones) {
                let prestaciones = [];
                ofertaPrestacional[1].prestaciones.forEach((prest: { id: Number, disponible: String, nombre: String }) => {
                    if (prest.disponible === 'SI') {
                        prestaciones.push({ idSisa: prest.id, nombre: prest.nombre });
                    }
                });
                organizaciones[i]['ofertaPrestacional'] = prestaciones;
                await Organizacion.findOneAndUpdate({ _id: organizaciones[i].id }, organizaciones[i]);
            }
        }
    } catch (err) {
        return null;
    }
}


/*
* Función que carga en DB los teléfonos traidos de SISA de los efectores que se muestran (showMapa = true) en el mapa de salud de la app mobile.
*/
export async function actualizarContacto() {
    try {
        let organizaciones: any[] = await Organizacion.find({ showMapa: true }); // , 'contacto.0': { $exists: false } });
        for (let i = 0; i < organizaciones.length; i++) {
            let organizacionSisa = await validarOrganizacionSisa(organizaciones[i].codigo.sisa);
            if (organizacionSisa && organizacionSisa[0] === 200) {
                let contactos = [];
                let contactoAux;
                if (organizacionSisa[1].telefono1 && organizacionSisa[1].telefono1.numero !== 'null') {
                    contactos.push({ tipo: 'fijo', valor: parseTelefono(organizacionSisa[1].telefono1.numero), ranking: 0, ultimaActualizacion: new Date(), activo: true });
                }
                if (organizacionSisa[1].telefono2 && organizacionSisa[1].telefono2.numero !== 'null') {
                    contactoAux = parseTelefono(organizacionSisa[1].telefono2.numero);
                    if (!contactos.find(c => c.valor === contactoAux)) {
                        contactos.push({ tipo: 'fijo', valor: contactoAux, ranking: 0, ultimaActualizacion: new Date(), activo: true });
                    }
                }
                if (organizacionSisa[1].telefono3 && organizacionSisa[1].telefono3.numero !== 'null') {
                    contactoAux = parseTelefono(organizacionSisa[1].telefono3.numero);
                    if (!contactos.find(c => c.valor === contactoAux)) {
                        contactos.push({ tipo: 'fijo', valor: contactoAux, ranking: 0, ultimaActualizacion: new Date(), activo: true });
                    }
                }
                if (organizacionSisa[1].telefono4 && organizacionSisa[1].telefono4.numero !== 'null') {
                    contactoAux = parseTelefono(organizacionSisa[1].telefono4.numero);
                    if (!contactos.find(c => c.valor === contactoAux)) {
                        contactos.push({ tipo: 'fijo', valor: contactoAux, ranking: 0, ultimaActualizacion: new Date(), activo: true });
                    }
                }
                organizaciones[i]['contacto'] = contactos;
                await Organizacion.findOneAndUpdate({ _id: organizaciones[i].id }, organizaciones[i]);
            }
        }
    } catch (err) {
        return null;
    }
}

function parseTelefono(telefono: string): string {
    let res = telefono;
    while (res[0] === '0') {
        res = res.slice(1);
    }
    res = res.replace(/\s/g, '').replace(/-/g, '');
    let notANumber = res.match(/[^0-9]/);   // Busca el primer caracter no numérico.
    if (notANumber.index > -1) {
        res = res.slice(0, notANumber.index);
    }
    return res;
}
