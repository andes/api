import * as moment from 'moment';
import { loadImage, InformePDF, getAssetsURL } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';

export class CensoFooter extends HTMLComponent {
    template = `
    <!-- Footer -->
    <footer id="pageFooter">
        <!-- Firmas -->
        <span class="contenedor-firmas"></span>
        <hr>
        <span class="contenedor-zocalo">
            <img class="logo-pdp" src="data:image/png;base64,{{ logos.logoPDP }}">
            <article class="contenedor-data-pdp">
                <h6>Nota: El contenido de este informe ha sido validado digitalmente siguiendo los estándares de
                    calidad y seguridad
                    requeridos. El ministerio de salud de la provincia de Neuquén es responsable inscripto en el
                    Registro
                    Nacional de Protección de Datos Personales, según lo requiere la Ley N° 25.326 (art. 3° y 21 inciso
                    1).</h6>
            </article>
            <article class="contenedor-data-organizacion">
                <h6>
                    {{{ organizacion.nombre }}}
                </h6>
                <h6></h6>
            </article>
            <article class="contenedor-data-impresion">
                <h6 class="bolder">Impreso por:</h6>
                <h6>
                    {{ usuario }}
                </h6>
                <h6>
                    {{ fechaActual }}
                </h6>
            </article>
            <hr>
            <span class="numeracion">
                {{{ numeracionHTML }}}
            </span>
        </span>
    </footer>
    <!-- END Footer -->
           `;

    constructor(public usuario, public organizacion) {
        super();

        this.data = {
            usuario,
            fechaActual: moment().format('DD [de] MMMM [de] YYYY'),
            organizacion: {
                nombre: organizacion.nombre.replace(' - ', '</br>'),
            },
            logos: {
                logoPDP: loadImage('templates/rup/informes/img/logo-pdp.png')
            },
            numeracionHTML: '<small> {{page}} </small> de <small> {{pages}} </small>'
        };
    }
}
