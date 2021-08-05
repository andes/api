import * as https from 'https';
import * as configPrivate from '../../../config.private';
import { farmaciasEndpoints } from '../../../config.private';
import { farmaciasLocalidades, farmaciasTurnos } from '../schemas/farmacias';

const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');


export async function findAddress(localidad, farmacia) {
    const data: any = await farmaciasTurnos.find({
        nombre: farmacia.nombre,
        direccion: farmacia.direccion,
        fecha: { $exists: false }
    }).limit(1);

    if (data.length) {
        return Promise.resolve({
            lat: data[0].latitud,
            lng: data[0].longitud
        });
    } else {
        const geo: any = await geocodeFarmacia(farmacia, localidad);

        const t = new farmaciasTurnos({
            nombre: farmacia.nombre,
            direccion: farmacia.direccion,
            telefono: farmacia.telefono ? farmacia.telefono : '',
            localidad: String(localidad.id),
            latitud: geo.lat,
            longitud: geo.lng
        });

        await t.save();
        return geo;

    }

}

export function geocodeFarmacia(farmacia, localidad) {
    return new Promise((resolve, reject) => {

        const address = farmacia.direccion + ',' + localidad.nombre;
        let pathGoogleApi = '';
        let jsonGoogle = '';

        pathGoogleApi = '/maps/api/geocode/json?address=' + address + ', ' + 'AR' + '&key=' + configPrivate.geoKey;

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
        const reqGet = https.request(optionsgetmsg, (res2) => {
            res2.on('data', (d, error) => {
                jsonGoogle = jsonGoogle + d.toString();
            });
            res2.on('end', () => {
                const salida = JSON.parse(jsonGoogle);
                if (salida.status === 'OK') {
                    return resolve(salida.results[0].geometry.location);
                } else {
                    return resolve({});
                }
            });
        });
        reqGet.end();
    });
}

export function donwloadData(desde, hasta) {
    return getLocalidades().then(async (data: any) => {
        const localidades = data.localidades;
        await farmaciasLocalidades.remove({});

        await farmaciasTurnos.remove({ fecha: { $exists: true } });

        for (const item of localidades) {
            await (new farmaciasLocalidades({
                localidadId: item.id,
                nombre: String(item.nombre)
            })).save();

            const _data: any = await getTurnos(data, item.id, desde, hasta);

            for (const turno of _data) {
                try {

                    const geocode: any = await findAddress(item, {
                        nombre: turno.nombre,
                        direccion: turno.direccion
                    });

                    const t = new farmaciasTurnos({
                        nombre: turno.nombre,
                        direccion: turno.direccion,
                        telefono: turno.telefono ? turno.telefono : '',
                        fecha: moment(turno.fecha, 'YYYY-MM-DD').toDate(),
                        localidad: String(item.id),
                        latitud: geocode.lat,
                        longitud: geocode.lng
                    });

                    await t.save();


                } catch (e) {

                }

            }
        }
        return Promise.resolve();
    }).catch(() => false);
}

export function getLocalidades() {

    return new Promise((resolve, reject) => {
        request(farmaciasEndpoints.localidades, (error, response, html) => {
            if (!error) {
                const localidades = [];
                const $ = cheerio.load(html);
                const options = $('#ctl00_ContentPlaceHolder1_CboLocalidad').children('option');
                options.each((i, elem) => {
                    const id = $(elem).attr('value');
                    const nombre = $(elem).text();
                    localidades.push({
                        id,
                        nombre
                    });
                });
                const __VIEWSTATE = $('#__VIEWSTATE').val();
                const __VIEWSTATEGENERATOR = $('#__VIEWSTATEGENERATOR').val();
                const __EVENTVALIDATION = $('#__EVENTVALIDATION').val();

                resolve({
                    localidades,
                    __VIEWSTATE,
                    __VIEWSTATEGENERATOR,
                    __EVENTVALIDATION
                });

            } else {
                reject(error);
            }
        });
    });
}


export function getTurnos(data, localidad, desde, hasta) {
    return new Promise((resolve, reject) => {
        desde = moment(desde, 'YYYY-MM-DD');
        hasta = moment(hasta, 'YYYY-MM-DD');
        const dd = desde.get('date');
        const dm = desde.get('month') + 1;
        const dy = desde.get('year');

        const hd = hasta.get('date');
        const hm = hasta.get('month') + 1;
        const hy = hasta.get('year');

        const url = farmaciasEndpoints.turnos + '?idLocalidad=' + localidad + '&dd=' + dd + '&dm=' + dm + '&da=' + dy + '&hd=' + hd + '&hm=' + hm + '&ha=' + hy;

        request.post(url, {
            form:
            {
                __VIEWSTATE: data.__VIEWSTATE,
                __VIEWSTATEGENERATOR: data.__VIEWSTATEGENERATOR,
                __EVENTVALIDATION: data.__EVENTVALIDATION,
                ctl00$ContentPlaceHolder1$CboLocalidad: localidad,
                ctl00$ContentPlaceHolder1$TxtDesde: desde.format('DD/MM/YYYY'),
                ctl00$ContentPlaceHolder1$TxtHasta: hasta.format('DD/MM/YYYY'),
                ctl00$ContentPlaceHolder1$BtnConsultar: 'Consultar'
            }
        },

        (error, response, html) => {
            if (!error) {
                const $ = cheerio.load(html);
                const hijos = $('#download-container').children().slice(2);
                let fecha = null;
                const farmacias = [];
                $(hijos).each((i, elem) => {
                    if (elem.name === 'br') {
                        // continue;
                    } else {
                        if ($(elem).attr('class') && $(elem).attr('class').indexOf('title-turno') > -1) {
                            fecha = moment($(elem).text().substr(-10, 10), 'DD/MM/YYYY').format('YYYY-MM-DD');
                        } else if (elem.name === 'div') {
                            const $els = $(elem).children();
                            const nombre = $($els[0]).text();
                            const direccion = $($els[1]).text();
                            const phone = $($els[2]).text();
                            farmacias.push({
                                fecha,
                                nombre,
                                direccion,
                                telefono: phone
                            });
                        }
                    }

                });
                resolve(farmacias);
            } else {
                reject(error);
            }
        });
    });
}
