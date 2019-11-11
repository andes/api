import * as fs from 'fs';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import { Auth } from '../../../auth/auth.class';
import * as path from 'path';
import * as moment from 'moment';

export class DocumentoCenso {

    private static options: pdf.CreateOptions = {};

    private generarCSS() {
        // Se agregan los estilos CSS
        let scssFile = path.join(__dirname, '../../../templates/rup/informes/sass/main.scss');

        // Se agregan los estilos
        let css = '<style>\n\n';

        // SCSS => CSS
        css += scss.renderSync({
            file: scssFile
        }).css;
        css += '</style>';
        return css;
    }

    async generarHTML(req) {
        return new Promise((resolve, reject) => {
            let html = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/html/censoDiario.html'), 'utf8');
            let params = req.body;
            // Se carga logo del efector, si no existe se muestra el nombre del efector como texto
            let nombreLogo = params.organizacion.nombre.toLocaleLowerCase().replace(/-|\./g, '').replace(/ {2,}| /g, '-');
            try {
                let logoEfector;
                logoEfector = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/efectores/' + nombreLogo + '.png'));
                html = html
                    .replace('<!--logoOrganizacion-->', `<img class="logo-efector" src="data:image/png;base64,${logoEfector.toString('base64')}">`);
            } catch (fileError) {
                html = html
                    .replace('<!--logoOrganizacion-->', `<b class="no-logo-efector">${params.organizacion.nombre}</b>`);
            }

            // Logos comunes a todos los informes
            let logoAdicional = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-adicional.png'));
            let logoAndes = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-andes-h.png'));
            let logoPDP = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-pdp.png'));
            let logoPDP2 = fs.readFileSync(path.join(__dirname, '../../../templates/rup/informes/img/logo-pdp-h.png'));

            // Firmas
            html = html
                .replace('<!--logoAdicional-->', `<img class="logo-adicional" src="data:image/png;base64,${logoAdicional.toString('base64')}">`)
                .replace('<!--logoAndes-->', `<img class="logo-andes" src="data:image/png;base64,${logoAndes.toString('base64')}">`)
                .replace('<!--logoPDP-->', `<img class="logo-pdp" src="data:image/png;base64,${logoPDP.toString('base64')}">`)
                .replace('<!--logoPDP2-->', `<img class="logo-pdp-h" src="data:image/png;base64,${logoPDP2.toString('base64')}">`);

            const fechaCenso = moment(params.fecha).format('DD/MM/YYYY');
            const unidadOrganizativa = params.unidad.term;

            // vamos a armar la tabla con los datos del censo
            let filas = '';
            for (let i = 0; i < params.listadoCenso.length; i++) {
                let censo = params.listadoCenso[i];
                filas += `<tr><td>${censo.dataCenso.ultimoEstado.paciente.apellido} ${censo.dataCenso.ultimoEstado.paciente.nombre} |
                             ${censo.dataCenso.ultimoEstado.paciente.documento}</td>
                             <td>${censo.dataCenso.cama.nombre}</td>
                             <td>${censo.esIngreso ? 'SI' : 'NO'}</td>
                             <td>${censo.esPaseDe ? censo.esPaseDe.unidadOrganizativa.term : ''}</td>
                             <td>${censo.egreso}</td>
                             <td>${censo.esPaseA ? censo.esPaseA.unidadOrganizativa.term : ''}</td></tr>`;
            }

            let filaResumen = '';
            if (params.resumenCenso) {
                filaResumen = `<tr>
                     <td>${ params.resumenCenso.existencia0}</td>
                    <td>${ params.resumenCenso.ingresos}</td>
                     <td>${ params.resumenCenso.pasesDe}</td>
                     <td>${ params.resumenCenso.egresosAlta}</td>
                    <td>${ params.resumenCenso.egresosDefuncion}</td>
                     <td>${ params.resumenCenso.pasesA}</td>
                     <td>${ params.resumenCenso.existencia24}</td>
                     <td>${ params.resumenCenso.ingresoEgresoDia}</td>
                     <td>${ params.resumenCenso.pacientesDia}</td>
                      <td>${ params.resumenCenso.disponibles24}</td>
                      <td>${ params.resumenCenso.diasEstada}</td>
                 </tr>`;

            }

            html = html
                .replace('<!--fechaCenso-->', fechaCenso)
                .replace('<!--unidadOrganizativa-->', unidadOrganizativa)
                .replace('<!--contenidoCenso-->', filas)
                .replace('<!--ContenidoResumen-->', filaResumen);

            // FOOTER
            html = html
                .replace('<!--usuario-->', Auth.getUserName(req))
                .replace(/(<!--fechaActual-->)/g, moment().format('DD/MM/YYYY HH:mm') + ' hs')
                .replace('<!--organizacionNombreSolicitud-->', params.organizacion.nombre);


            resolve(html);
        });

    }
    /**
         *
         * @param req ExpressJS request
         * @param res ExpressJS response
         * @param next ExpressJS next
         * @param options html-pdf/PhantonJS rendering options
         */
    public descargar(req, res, next, options = null) {

        return new Promise((resolve, reject) => {
            let phantomPDFOptions: pdf.CreateOptions = {
                format: 'A4',
                border: {
                    // default is 0, units: mm, cm, in, px
                    top: '.25cm',
                    right: '0cm',
                    bottom: '3cm',
                    left: '0cm'
                },
                header: {
                    height: '5.75cm',
                },
                footer: {
                    height: '1cm',
                    contents: {}
                }
            };

            DocumentoCenso.options = DocumentoCenso.options || phantomPDFOptions;

            this.generarHTML(req).then(htmlPDF => {
                htmlPDF = htmlPDF + this.generarCSS();
                pdf.create(htmlPDF, DocumentoCenso.options).toFile((err2, file): any => {

                    if (err2) {
                        reject(err2);
                    }

                    resolve(file.filename);

                });
            });

        });
    }
}
