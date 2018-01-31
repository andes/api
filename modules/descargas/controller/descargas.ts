
import * as fs from 'fs';
import * as moment from 'moment';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import { Auth } from '../../../auth/auth.class';

export function generarHTML(req) {

    let html = '';
    html += Buffer.from(req.body.html, 'base64').toString();

    let css = '<style>\n\n';

    css += scss.renderSync({
        file: './templates/rup/prestacionValidacion-print.scss',
        includePaths: [
            './templates/rup/'
        ]
    }).css;

    css += '</style>';

    html += css;


    let logoAndes = fs.readFileSync('./templates/andes/logo-andes.png');
    let logotipoAndes = fs.readFileSync('./templates/andes/logotipo-andes-blue.png');
    let logoPDP = fs.readFileSync('./templates/andes/logo-pdp.png');

    html = html.replace('<!--logoAndes-->', `<img src="data:image/png;base64,${logoAndes.toString('base64')}" style="float: left;">`);
    html = html.replace('<!--logotipoAndes-->', `<img src="data:image/png;base64,${logotipoAndes.toString('base64')}" style="width: 80px; margin-right: 10px;">`);

    html += `<footer id="pageFooter" style="background-color: rgba(0,0,0,0.1); display: inline-block; font-size: 8px; margin-bottom: 15px; padding: 5px;">
        <img src="data:image/png;base64,${logoPDP.toString('base64')}" style="display: inline-block; width: 100px; float: right;">
        <div style="display: inline-block; float: left; width: 400px; margin-right: 10px; text-align: justify;">
            El contenido de este informe ha sido validado digitalmente siguiendo los estándares de calidad y seguridad requeridos. El   Hospital Provincial Neuquén es responsable Inscripto en el Registro Nacional de Protección de Datos Personales bajo el N° de Registro 100000182, según lo requiere la Ley N° 25.326 (art. 3° y 21 inciso 1)
            ${JSON.stringify(Auth.getUserName(req))} - ${moment().format('ddd DD/MM/YYYY H:m')} hs
        </div>
    </footer>`;

    return html;
}

export function generarPDF(req, res, next) {

    let options = {
        format: 'A4',
        border: {
            // default is 0, units: mm, cm, in, px
            top: '0.5cm',
            right: '0.5cm',
            bottom: '1.5cm',
            left: '1.5cm'
        },
        // Override the initial pagination number
        paginationOffset: 1,
        header: {
            height: '2.5cm',
        },
        footer: {
            height: '10mm',
            contents: {
            }
        },
        settings: {
            resourceTimeout: 30
        },
    };

    let html = generarHTML(req);

    pdf.create(html, options).toFile((err2, file) => {

        if (err2) {
            console.log('Error PDF');
            return console.log(err2);
        }

        res.download(file.filename, (err3) => {
            if (err2) {
                console.log('Error durante la descarga', err3);
                next(err3);
            } else {
                next();
            }
        });
    });
}