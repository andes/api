
import * as fs from 'fs';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import { Auth } from '../../../auth/auth.class';

export class Documento {

    private static locale = 'es-ES';
    private static timeZone = 'America/Argentina/Buenos_Aires';

    /**
     * Opciones default de PDF rendering
     */
    private static options: any = {};

    /**
     *
     * @param req ExpressJS request
     * TODO: Extender
     */
    private static generarHTML(req) {

        // Se genera HTML para ser transformado en PDF
        let html = Buffer.from(req.body.html, 'base64').toString();

        // Se agregan los estilos CSS
        html += this.generarCSS();

        // Se cargan logos
        let logoAndes = fs.readFileSync('./templates/andes/logo-andes.png');
        let logotipoAndes = fs.readFileSync('./templates/andes/logotipo-andes-blue.png');
        let logoPDP = fs.readFileSync('./templates/andes/logo-pdp.png');

        // Se reemplazan ciertos <!--placeholders--> por logos de ANDES y Dirección de Protección de Datos Personales
        html = html.replace('<!--logoAndes-->', `<img src="data:image/png;base64,${logoAndes.toString('base64')}" style="float: left;">`);
        html = html.replace('<!--logotipoAndes-->', `<img src="data:image/png;base64,${logotipoAndes.toString('base64')}" style="width: 80px; margin-right: 10px;">`);

        html += `<footer id="pageFooter" style="background-color: rgba(0,0,0,0.1); display: inline-block; font-size: 8px; margin-bottom: 15px; padding: 5px;">
        <img src="data:image/png;base64,${logoPDP.toString('base64')}" style="width: 100px; float: right;">
        <div style="float: left; width: 400px; margin-right: 10px; text-align: justify;">
            El contenido de este informe ha sido validado digitalmente siguiendo los estándares de calidad y seguridad requeridos. El Hospital Provincial Neuquén es responsable Inscripto en el Registro Nacional de Protección de Datos Personales bajo el N° de Registro 100000182, según lo requiere la Ley N° 25.326 (art. 3° y 21 inciso 1)
            ${JSON.stringify(Auth.getUserName(req))} - ${new Date().toLocaleString('locale', { timeZone: this.timeZone })} hs
        </div>
    </footer>`;

        return html;
    }

    /**
     * Genera CSS de RUP
     * TODO: Extender
     */
    private static generarCSS() {

        // Se agregan los estilos
        let css = '<style>\n\n';

        // SCSS => CSS
        css += scss.renderSync({
            file: './templates/rup/prestacionValidacion-print.scss',
            includePaths: [
                './templates/rup/'
            ]
        }).css;

        css += '</style>';

        return css;
    }

    /**
     *
     * @param req ExpressJS request
     * @param res ExpressJS response
     * @param next ExpressJS next
     * @param options html-pdf/PhantonJS rendering options
     */
    static generar(req, res, next, options = null) {

        let html = '';
        switch (req.params.tipo) {
            case 'pdf':
                // PhantomJS PDF rendering options
                // https://www.npmjs.com/package/html-pdf
                // http://phantomjs.org/api/webpage/property/paper-size.html
                let phantomPDFOptions: any = {
                    format: 'A4',
                    border: {
                        // default is 0, units: mm, cm, in, px
                        top: '0.5cm',
                        right: '0.5cm',
                        bottom: '1.5cm',
                        left: '1.5cm'
                    },
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

                if (options !== {}) {
                    this.options = options;
                } else {
                    this.options = phantomPDFOptions;
                }

                html = this.generarHTML(req);

                pdf.create(html, this.options).toFile((err2, file) => {

                    if (err2) {
                        return next(err2);
                    }

                    res.download(file.filename, (err3) => {
                        if (err3) {
                            next(err3);
                        } else {
                            next();
                        }
                    });
                });
                break;
            case 'html':
                html = this.generarHTML(req);

                let htmlfile = fs.writeFileSync(__dirname + '/rup.html', html);
                res.download(__dirname + '/rup.html', (err) => {
                    if (err) {
                        next(err);
                    } else {
                        next();
                    }
                });
                break;
            case 'txt':
                // TODO
                break;
            case 'png':
                // TODO
                break;
        }

    }
}
