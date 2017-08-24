import { farmaciasEndpoints } from '../../../config.private';

let request = require('request');
let cheerio = require('cheerio');
let moment = require('moment');

import { farmaciasLocalidades, farmaciasTurnos } from '../schemas/farmacias';

export function donwloadData(desde, hasta) {
    getLocalidades().then((localidades: any[]) => {

        farmaciasLocalidades.remove({}, function (err) {

            localidades.forEach(item => {

                let f = new farmaciasLocalidades({
                    localidadId: item.id,
                    nombre: item.nombre
                }).save();

                let desdeD = moment(desde, 'YYYY-MM-DD').toDate();
                let hastaD = moment(hasta, 'YYYY-MM-DD').toDate();
                farmaciasTurnos.remove({ fecha: { '$gte': desdeD, '$lte': hastaD } }, function () {
                    getTurnos(item.id, desde, hasta).then((data: any[]) => {
                        data.forEach(turno => {
                            let t = new farmaciasTurnos({
                                nombre: turno.nombre,
                                direccion: turno.direccion,
                                telefono: turno.telefono ? turno.telefono : '',
                                fecha: moment(turno.fecha, 'YYYY-MM-DD').toDate(),
                                localidad: item.id
                            }).save();

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
                let options = $('#ContentPlaceHolder1_CboLocalidad').children('option');
                options.each(function (i, elem) {
                    let id = $(elem).attr('value');
                    let nombre = $(elem).text();
                    localidades.push({
                        id,
                        nombre
                    });
                });
                resolve(localidades);
            } else {
                reject(error);
            }
        });
    });
}


export function getTurnos(localidad, desde, hasta) {
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

        request(url, function (error, response, html) {
            if (!error) {
                let $ = cheerio.load(html);
                let hijos = $('body').children().first().children().slice(4);

                let datos = {};
                let fecha = null;
                let farmacias = [];
                $(hijos).each(function (i, elem) {
                    if ($(elem).attr('style')) {
                        fecha = moment($(elem).children().html(), 'DD/MM/YYYY').format('YYYY-MM-DD');
                    } else if (elem.name === 'div') {
                        let $els = $(elem).contents();
                        let nombre = $($els[0]).text();
                        let direccion = $($els[2]).text();
                        let phone = $($els[4]).text();
                        farmacias.push({
                            fecha,
                            nombre,
                            direccion,
                            telefono: phone
                        });
                    }

                });
                resolve(farmacias);
            } else {
                reject(error);
            }
        });
    });
}
