import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';

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
                        <span class="titulo-profesion">{{nacionalidad}} <span class="texto-vencimiento">F.VENCIMIENTO:</span> {{fecha_nacimiento}}</span><br>
                    </td>
                </tr>
                <tr>
                    <td colspan="2">
                        <span class="titulo-entidad">{{entidad_formadora }}</span><br>
                        <span><span class="text-bold">EGRESO:</span> {{egreso}}  </span><br>
                        <span><span class="text-bold">PRIMER MATRÍCULA:</span> {{primer_matricula}}</span><br>
                        <span><span class="text-bold">RENOVACIÓN:</span> {{renovacion}}</span><br>
                        <span><span class="text-bold">FECHA IMPRESIÓN:</span> {{fecha_impresion}}</span><br>
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
        const formacion = formacionGrado.profesion.nombre;
        const matricula = formacionGrado.matriculacion[formacionGrado.matriculacion.length - 1].matriculaNumero;
        const documento = profesional.documento;
        const nacionalidad = profesional.nacionalidad.nombre;
        const fecha_nacimiento = moment(profesional.fecha_nacimiento).format('DD/MM/YYYY');
        const entidad_formadora = formacionGrado.entidadFormadora.nombre;
        const egreso = moment(formacionGrado.fechaEgreso).format('DD/MM/YYYY');
        const primer_matricula = moment(formacionGrado.matriculacion[0].inicio).format('DD/MM/YYYY');
        const renovacion = moment(formacionGrado.matriculacion[formacionGrado.matriculacion.length - 1].fin).format('DD/MM/YYYY');
        const fecha_impresion = moment().format('DD/MM/YYYY');

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
            fecha_nacimiento,
            entidad_formadora,
            egreso,
            primer_matricula,
            renovacion,
            fecha_impresion,
            qrdecod
        };
    }
}
