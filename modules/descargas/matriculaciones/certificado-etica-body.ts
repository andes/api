import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';

export class RecuperoCostoBody extends HTMLComponent {
    template = `
    <main>
        <section>
            <div class="text-center">
                <b>Provincia del Neuquén</b>
            </div>
            <div class="row">
                <div class="col">
                    {{ body }}
                </div>
            </div>
            <div class="row">
                <div class="col">
                    {{ firmaSupervisor }}
                </div>
            </div>
            <div class="row">
                <div class="col">
                    {{ footer }}
                </div>
            </div>
        </section>
    </main>
    `;

    constructor(public _data) {
        super();

        const matricula = _data.nombre;
        const profesional = _data.profesional;
        const firmaSupervisor = loadImage('templates/matriculaciones/img/firma-supervisor.jpg');
        const footer = 'Dirección de Fiscalización Sanitaria | Antártida Argentina y Colón, Edif. CAM 3 | CP (8300) Neuquén | Tel.: 0299 - 4495590 / 5591';
        const body = `La Dirección de Fiscalización Sanitaria de la Subsecretaría de salud de la Provincai de Neuquén, CERTIFICA que ${profesional.apellido}, 
        ${profesional.nombre} - DNI ${profesional.documento} se encuentra inscripto/a en el Registro Único de Profesionales de la Salud de la Provincia de 
        Neuquén como ${matricula.titulo} bajo la matrícula N° ${matricula.numero} desde ${matricula.fechaAlta}.
        <br><br>
        A la fecha, no surge de nuestros registros presuntas infracciones emergentes del incumplimiento de la Ley N° 578 y su Decreto Reglamentario N° 338/78, referidas al citado profesional.
        <br><br>
        <b>Por pedido del interesado/a, a los fines que hubiere lugar, se extiende el presente, en Neuquén a los ${moment().format('D')} días del mes de ${(moment().format('MMMM'))} de ${moment().format('YYYY')}.</b>
        <br><br>
        EL PRESENTE CERTIFICADO TIENE VALIDEZ POR EL TERMINO DE 30 (TREINTA) DIAS.`;

        this.data = {
            body,
            footer,
            firmaSupervisor
        };
    }
}
