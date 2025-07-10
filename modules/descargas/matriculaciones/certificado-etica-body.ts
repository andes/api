import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';

export class CertificadoEticaBody extends HTMLComponent {
    template = `
    <main>
        <h4 align="center">
            <b>Provincia del Neuquén</b>
        </h4>
        <section>
            <div class="row">
                <div class="col">
                    <p>
                        La Dirección de Fiscalización Sanitaria de la Subsecretaría de Salud de la Provincia de Neuquén, CERTIFICA que {{ profesional.apellido }},
                        {{ profesional.nombre }} - DNI {{ profesional.documento }} se encuentra inscripto/a en el Registro Único de Profesionales de la Salud de la Provincia de
                        Neuquén como {{ matricula.grado.titulo }} bajo la matrícula N° {{ matricula.grado.matriculaNumero }} desde {{ matricula.grado.fechaAlta }}.
                    
                        {{#if tienePosgrados}}
                            Y como especialista en:
                            <br/><br/>
                            <table class="w-100">
                                <thead>
                                    <tr>
                                        <td class="w-75">Especialidad</td>
                                        <td>Mat N°</td>
                                        <td>Desde</td>
                                    </tr>
                                </thead>
                            </table>
                            <hr>
                            <table class="w-100">
                                <tbody>
                                    {{#each matricula.posgrados}}
                                        <tr>
                                            <td class="w-75">{{ titulo }}</td>
                                            <td>{{ matriculaNumero }}</td>
                                            <td>{{ fechaAlta }}</td>
                                        </tr>
                                    {{/each}}
                                </tbody>
                            </table>
                        {{/if}}
                    <p>
                        A la fecha, no surge de nuestros registros presuntas infracciones emergentes del incumplimiento de la Ley N° 578, y su Decreto Reglamentario N° 338/78, referidas al citado profesional.
                    </p>
                    <p>
                        <b>{{ detalleExtension }}</b>
                    </p>
                    <p>
                        EL PRESENTE CERTIFICADO TIENE VALIDEZ POR EL TÉRMINO DE 30(TREINTA) DÍAS.
                    </p>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <!-- <img class="firmas" src="data:image/png;base64,{{ firmaJefeRegistro }}"> -->
                    <img class="firmas" src="data:image/png;base64,{{ firmaSupervisor }}">
                    <img  class="sello" src="data:image/png;base64,{{ selloSubse }}">

                </div>
            </div>
        </section>
    </main>
    `;

    constructor(public _data) {
        super();

        const tienePosgrados = (_data.matricula.posgrados?.length > 0);
        const firmaSupervisor = loadImage('templates/matriculaciones/img/firma-supervisor.png');
        const selloSubse = loadImage('templates/matriculaciones/img/sello.png');
        // const firmaJefeRegistro = loadImage('templates/matriculaciones/img/firma-jefe-registro.png');
        const footer = 'Dirección de Fiscalización Sanitaria | Antártida Argentina y Colón, Edif. CAM 3 | CP (8300) Neuquén | Tel.: 0299 - 4495590 / 5591';
        const detalleExtension = `Por pedido del interesado/a, a los fines que hubiere lugar, se extiende el presente, en Neuquén a los ${moment().format('D')} días del mes de ${(moment().format('MMMM'))} de ${moment().format('YYYY')}.`;
        _data.matricula.grado.fechaAlta = moment(_data.matricula.grado.fechaAlta).format('DD/MM/YYYY');
        _data.matricula.posgrados?.map(p => p.fechaAlta = moment(p.fechaAlta).format('YYYY'));
        this.data = {
            matricula: _data.matricula,
            profesional: _data.profesional,
            tienePosgrados,
            detalleExtension,
            footer,
            firmaSupervisor,
            selloSubse
            // firmaJefeRegistro
        };
    }

    parseFecha(fecha) {
        return moment(fecha).format('DD/MM/YYYY');
    }
}
