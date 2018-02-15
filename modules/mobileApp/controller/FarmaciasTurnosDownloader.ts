import { farmaciasEndpoints } from '../../../config.private';

let request = require('request');
let cheerio = require('cheerio');
let moment = require('moment');

import { farmaciasLocalidades, farmaciasTurnos } from '../schemas/farmacias';

export function donwloadData(desde, hasta) {
    getLocalidades().then((data: any) => {
        let localidades = data.localidades;
        farmaciasLocalidades.remove({}, function (err) {

            localidades.forEach(item => {

                let f = new farmaciasLocalidades({
                    localidadId: item.id,
                    nombre: item.nombre
                }).save();

                let desdeD = moment(desde, 'YYYY-MM-DD').toDate();
                let hastaD = moment(hasta, 'YYYY-MM-DD').toDate();
                farmaciasTurnos.remove({ fecha: { '$gte': desdeD, '$lte': hastaD } }, function () {

                    getTurnos(data, item.id, desde, hasta).then((_data: any[]) => {
                        _data.forEach(turno => {
                            try {
                                let t = new farmaciasTurnos({
                                    nombre: turno.nombre,
                                    direccion: turno.direccion,
                                    telefono: turno.telefono ? turno.telefono : '',
                                    fecha: moment(turno.fecha, 'YYYY-MM-DD').toDate(),
                                    localidad: item.id
                                });
                                t.save();
                            } catch (e) {

                            }

                        });
                    });
                });


            });

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
