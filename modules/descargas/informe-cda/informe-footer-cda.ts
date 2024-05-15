import { loadImage } from '../model/informe.class';
import moment = require('moment');
import { HTMLComponent } from '../model/html-component.class';

export class InformeCDAFooter extends HTMLComponent {
    template = `
    <!-- Firmas -->
        <span class="contenedor-firmas"></span>
        <hr>
        <span class="contenedor-zocalo">
            <img class="logo-pdp" src="data:image/png;base64,{{ logos.pdp }}">
            <article class="contenedor-data-pdp">
                <h6>Nota: {{{ notaPie }}} </h6>
            </article>
            <article class="contenedor-data-organizacion">
                <h6>
                    {{{ organizacion.nombre }}}
                </h6>
                <h6>
                    {{ organizacion.direccion }}
                </h6>
            </article>
            <article class="contenedor-data-impresion">
                <h6 class="bolder">Impreso por:</h6>
                <h6>
                    {{usuario.apellido}} {{usuario.nombre}}
                </h6>
                <h6>
                    {{ hora }}hs
                </h6>
            </article>
            <hr>
            <span class="numeracion">
                {{{ numeracionHTML }}}
            </span>
        </span>
    `;

    constructor(public usuario, public organizacion) {
        super();

        this.data = {
            usuario,
            organizacion: {
                nombre: organizacion ? organizacion.nombre.replace(' - ', '</br>') : '',
                direccion: organizacion ? organizacion.direccion.valor + ', ' + organizacion.direccion.ubicacion.localidad.nombre : ''
            },
            hora: moment().format('DD/MM/YYYY HH:mm'),
            logos: {
                pdp: loadImage('templates/rup/informes/img/logo-pdp.png'),
            },
            numeracionHTML: '<small> {{page}} </small> de <small> {{pages}} </small>',
            notaPie: organizacion.configuraciones?.notaAlPie || InformeCDAFooter.notaAlPieDefault
        };
    }

    static readonly notaAlPieDefault = `El contenido de este informe ha sido validado digitalmente siguiendo los estándares de
    calidad y seguridad
    requeridos. El ministerio de salud de la provincia de Neuquén es responsable inscripto en el
    Registro
    Nacional de Protección de Datos Personales, según lo requiere la Ley N° 25.326 (art. 3° y 21 inciso
    1).`;
}
