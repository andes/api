
import * as fs from 'fs';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import { Auth } from '../../../auth/auth.class';
import * as path from 'path';

export class Documento {

    private static locale = 'es-ES';
    private static timeZone = 'America/Argentina/Buenos_Aires';

    // Se leen header y footer (si se le pasa un encoding, devuelve un string)
    private static headerHTML = fs.readFileSync('./templates/andes/html/header.html', 'utf8');
    private static footerHTML = fs.readFileSync('./templates/andes/html/footer.html', 'utf8');

    /**
     * Opciones default de PDF rendering
     */
    private static options: pdf.CreateOptions = {};

    /**
     *
     * @param req ExpressJS request
     * TODO: Extender
     */
    private static generarHTML(req) {

        // SCSS según Tipo de Prestación
        const scssFile = typeof req.body.scssFile !== 'undefined' ? req.body.scssFile : 'prestacion-print';

        // Se genera HTML para ser transformado en PDF
        let html = Buffer.from(req.body.html, 'base64').toString();

        // Se agregan los estilos CSS
        html += this.generarCSS(path.join(__dirname, '../../../templates/rup/' + scssFile + '.scss'));

        // Se cargan logos
        let logoAndes = fs.readFileSync(path.join(__dirname, '../../../templates/andes/logo-andes.png'));
        let logotipoAndes = fs.readFileSync(path.join(__dirname, '../../../templates/andes/logotipo-andes-blue.png'));
        let logoPDP = fs.readFileSync(path.join(__dirname, '../../../templates/andes/logo-pdp.png'));

        html += this.headerHTML;
        html += this.footerHTML;

        // Se reemplazan ciertos <!--placeholders--> por logos de ANDES y Dirección de Protección de Datos Personales
        // Y datos de sesión (organización, nombre del usuario, timestamp)
        html = html.replace('<!--logoAndes-->', `<img class="logoAndes" src="data:image/png;base64,${logoAndes.toString('base64')}">`)
            .replace('<!--logotipoAndes-->', `<img class="logotipoAndes" src="data:image/png;base64,${logotipoAndes.toString('base64')}">`)
            .replace('<!--logoPDP-->', `<img class="logoPDP" src="data:image/png;base64,${logoPDP.toString('base64')}">`)
            .replace('<!--organizacion-->', Auth.getOrganization(req, 'nombre'))
            .replace('<!--usuario-->', JSON.stringify(Auth.getUserName(req)))
            .replace('<!--timestamp-->', new Date().toLocaleString('locale', { timeZone: this.timeZone }));

        return html;
    }

    /**
     * Genera CSS de RUP
     */
    private static generarCSS(scssFile = path.join(__dirname, '../../../templates/rup/prestacion-print.scss')) {

        // Se agregan los estilos
        let css = '<style>\n\n';

        // SCSS => CSS
        css += scss.renderSync({
            file: scssFile,
            includePaths: [
                path.join(__dirname, '../../../templates/rup/')
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
    static descargar(req, res, next, options = null) {

        return new Promise((resolve, reject) => {

            let html = '';
            switch (req.params.tipo) {
                case 'pdf':
                    // PhantomJS PDF rendering options
                    // https://www.npmjs.com/package/html-pdf
                    // http://phantomjs.org/api/webpage/property/paper-size.html
                    let phantomPDFOptions: pdf.CreateOptions = {
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
                                default: '<span class="text-muted">{{page}}</span>/<span>{{pages}}</span>'
                            }
                        },
                    };

                    if (options !== null) {
                        this.options = options;
                    } else {
                        this.options = phantomPDFOptions;
                    }

                    html = this.generarHTML(req);

                    pdf.create(html, this.options).toFile((err2, file): any => {

                        if (err2) {
                            reject(err2);
                        }

                        resolve(file.filename);

                    });
                    break;
            }

        });
    }

}
