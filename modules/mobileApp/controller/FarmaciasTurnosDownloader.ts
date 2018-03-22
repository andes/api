import { farmaciasEndpoints } from '../../../config.private';
import * as https from 'https';
import * as configPrivate from '../../../config.private';

let request = require('request');
let cheerio = require('cheerio');
let moment = require('moment');

import { farmaciasLocalidades, farmaciasTurnos } from '../schemas/farmacias';

export async function findAddress(localidad, farmacia) {
    let data: any = await farmaciasTurnos.find({
        nombre: farmacia.nombre,
        direccion: farmacia.direccion,
        fecha: {$exists: false}
    }).limit(1);

    if (data.length) {
        return Promise.resolve({
            lat: data[0].latitud,
            lng: data[0].longitud
        });
    } else {
        let geo: any =  await geocodeFarmacia(farmacia, localidad);

        let t = new farmaciasTurnos({
            nombre: farmacia.nombre,
            direccion: farmacia.direccion,
            telefono: farmacia.telefono ? farmacia.telefono : '',
            localidad: String(localidad.id),
            latitud: geo.lat,
            longitud: geo.lng
        });

        let saved = await t.save();

        return geo;

    }

}

export function geocodeFarmacia(farmacia, localidad) {
    return new Promise((resolve, reject) => {

        let address = farmacia.direccion + ',' + localidad.nombre;
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

        let optionsgetmsg = {
            host: 'maps.googleapis.com',
            port: 443,
            path: pathGoogleApi,
            method: 'GET',
            rejectUnauthorized: false
        };
        let reqGet = https.request(optionsgetmsg, function (res2) {
            res2.on('data', function (d, error) {
                jsonGoogle = jsonGoogle + d.toString();
            });
            res2.on('end', function () {
                let salida = JSON.parse(jsonGoogle);
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
    getLocalidades().then((data: any) => {
        let localidades = data.localidades;
        farmaciasLocalidades.remove({}, async function (err) {

            await farmaciasTurnos.remove({ fecha: {$exists: true} });

            for (let item of localidades) {
                let f = await (new farmaciasLocalidades({
                    localidadId: item.id,
                    nombre: String(item.nombre)
                })).save();

                let desdeD = moment(desde, 'YYYY-MM-DD').toDate();
                let hastaD = moment(hasta, 'YYYY-MM-DD').toDate();

                let _data: any = await getTurnos(data, item.id, desde, hasta);

                for (let turno of _data) {
                    try {

                        let geocode: any = await findAddress(item, {
                            nombre: turno.nombre,
                            direccion: turno.direccion
                        });

                        let t = new farmaciasTurnos({
                            nombre: turno.nombre,
                            direccion: turno.direccion,
                            telefono: turno.telefono ? turno.telefono : '',
                            fecha: moment(turno.fecha, 'YYYY-MM-DD').toDate(),
                            localidad: String(item.id),
                            latitud: geocode.lat,
                            longitud: geocode.lng
                        });

                        let saved = await t.save();


                    } catch (e) {
                    }

                }
            }

        });

    }).catch(() => false);
}

export function getLocalidades() {

    return new Promise((resolve, reject) => {
        request(farmaciasEndpoints.localidades, function (error, response, html) {
            if (!error) {
                let localidades = [];
                let $ = cheerio.load(html);
                let options = $('#ctl00_ContentPlaceHolder1_CboLocalidad').children('option');
                options.each(function (i, elem) {
                    let id = $(elem).attr('value');
                    let nombre = $(elem).text();
                    localidades.push({
                        id,
                        nombre
                    });
                });
                let __VIEWSTATE = $('#__VIEWSTATE').val();
                let __VIEWSTATEGENERATOR = $('#__VIEWSTATEGENERATOR').val();
                let __EVENTVALIDATION = $('#__EVENTVALIDATION').val();

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
        let dd = desde.get('date');
        let dm = desde.get('month') + 1;
        let dy = desde.get('year');

        let hd = hasta.get('date');
        let hm = hasta.get('month') + 1;
        let hy = hasta.get('year');

        let url = farmaciasEndpoints.turnos + '?idLocalidad=' + localidad + '&dd=' + dd + '&dm=' + dm + '&da=' + dy + '&hd=' + hd + '&hm=' + hm + '&ha=' + hy;

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

            function (error, response, html) {
                if (!error) {
                    let $ = cheerio.load(html);
                    let hijos = $('#download-container').children().slice(2);



                    let datos = {};
                    let fecha = null;
                    let farmacias = [];
                    $(hijos).each(function (i, elem) {
                        if (elem.name === 'br') {
                            // continue;
                        } else {
                            if ($(elem).attr('class') && $(elem).attr('class').indexOf('title-turno') > -1) {
                                fecha = moment($(elem).text().substr(-10, 10), 'DD/MM/YYYY').format('YYYY-MM-DD');
                            } else if (elem.name === 'div') {
                                let $els = $(elem).children();
                                let nombre = $($els[0]).text();
                                let direccion = $($els[1]).text();
                                let phone = $($els[2]).text();
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
