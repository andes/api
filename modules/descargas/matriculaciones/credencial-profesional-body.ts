import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';
import { getDateStr } from '../../../utils/utils';

export class CredencialProfesionalBody extends HTMLComponent {
    template = `
    <main>
        <section>
            <table>
                <tr>
                    <td colspan="2"><img class="logo-credencial" src="data:image/png;base64,{{ logo }}"></td>
                </tr>
                <tr>
                    <td>
                        <img class="img-qr" src="{{qrdecod}}">
                    </td>
                    <td class="datos_profesional">
                        <span class="titulo-profesional">{{formacion}} N°{{matricula}}</span><br>
                        <span>{{ apellido }} {{ nombre }}</span><br>
                        <span class="sexo-profesional">{{sexo}} <span class="texto-dni">DNI:</span> {{documento}}</span><br>
                        <span class="titulo-profesion">{{nacionalidad}} <span class="texto-vencimiento">F.NACIMIENTO:</span> {{fechaNacimiento}}</span><br>
                    </td>
                </tr>
                <tr #each >
                    <td colspan="2">
                        <span class="titulo-entidad">{{entidadFormadora }}</span><br>
                        <span><span class="text-bold">EGRESO:</span> {{egreso}}  </span><br>
                        <span><span class="text-bold">PRIMER MATRÍCULA:</span> {{primerMatricula}}</span><br>
                        <span><span class="text-bold">VENCIMIENTO:</span> {{vencimiento}}</span><br>
                        <span><span class="text-bold">FECHA IMPRESIÓN:</span> {{fechaImpresion}}</span><br>
                    </td>
                </tr>
                <tr>
                    <td colspan="2"><img class="logo-colores" src="data:image/png;base64,{{ colores }}"></td>
                </tr>
            </table>
        </section>
    </main>
    `;

    constructor(public profesional, public formacionId, public qrdecod) {
        super();
        const logo = loadImage('templates/matriculaciones/img/header_credencial.png');
        const colores = loadImage('templates/matriculaciones/img/colores-credencial.png');
        const nombre = profesional.nombre;
        const apellido = profesional.apellido;
        const sexo = profesional.sexo;
        const formacionGrado = profesional.formacionGrado.find((form) => form.id === formacionId);
        const matriculaciones = formacionGrado.matriculacion && formacionGrado.matriculacion.sort((a, b) => (a.inicio - b.inicio));
        const formacion = formacionGrado.profesion.nombre;
        const matricula = matriculaciones && matriculaciones[matriculaciones.length - 1].matriculaNumero;
        const documento = profesional.documento;
        const nacionalidad = profesional.nacionalidad.nombre;
        const fechaNacimiento = getDateStr(profesional.fechaNacimiento);
        const entidadFormadora = formacionGrado.entidadFormadora.nombre;
        const egreso = moment(formacionGrado.fechaEgreso).format('DD/MM/YYYY');
        const primerMatricula = formacionGrado.fechaDeInscripcion && moment(formacionGrado.fechaDeInscripcion).format('DD/MM/YYYY');
        const vencimiento = matriculaciones && moment(matriculaciones[matriculaciones.length - 1].fin).format('DD/MM/YYYY');
        const fechaImpresion = moment().format('DD/MM/YYYY');

        this.data = {
            logo,
            colores,
            nombre,
            apellido,
            formacion,
            matricula,
            sexo,
            documento,
            nacionalidad,
            fechaNacimiento,
            entidadFormadora,
            egreso,
            primerMatricula,
            vencimiento,
            fechaImpresion,
            qrdecod
        };
    }
}
