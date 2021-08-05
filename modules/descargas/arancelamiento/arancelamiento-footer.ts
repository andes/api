import { loadImage } from '../model/informe.class';
import { HTMLComponent } from '../model/html-component.class';
import * as configPrivate from '../../../config.private';

export class ArancelamientoFooter extends HTMLComponent {
    template = `
        <!-- Firmas -->
        <span class="contenedor-zocalo">
            <article>
                <img class="logo-pdp" src="data:image/png;base64,{{ logoPDP }}">
            </article>
            <article class="contenedor-pdp">
                <h6>Este contenido ha sido validado digitalmente siguiendo los estándares de
                calidad y seguridad requeridos. La Subsecretaría de Salud es responsable
                Inscripto en el Registro Nacional de Protección de Datos Personales bajo el N°
                de Registro 100000182, según lo requiere la Ley N° 25.326(art. 3° y 21 inciso 1)</h6>
            </article>

            <article class="contenedor-footer">
                <h6 class="bolder">
                    Ley Provincial 3012 - Ley de
                    Recupero Financiero Provincia del
                    Neuquen - Reglamentada por
                    decreto Provincial N 2165/18
                </h6>
            </article>
            <hr>
            <span class="numeracion">
                {{{ numeracionHTML }}}
            </span>
        </span>`;

    constructor() {
        super();
        const provincia = configPrivate.provincia || 'neuquen';
        this.data = {
            logoPDP: loadImage('templates/rup/informes/img/logo-pdp.png')
        };
    }
}
