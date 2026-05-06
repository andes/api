import { HTMLComponent } from '../../model/html-component.class';
import * as mime from 'mime-types';
import { getArchivoAdjunto } from '../../../../modules/rup/controllers/rup';
import { streamToJpegDataUri } from '../../../../utils/pdf/puppeteer';


export class AdjuntarDocumentoComponent extends HTMLComponent {
    template = `
            <div style="page-break-before: auto; page-break-after: auto;">
                <div class="nivel-1" >
                    <p>
                        {{ registro.concepto.term }}
                        {{#if noSoportados}} (Hay {{noSoportados}} documentos que no se pueden visualizar) {{/if}}
                        :
                    </p>
                </div>
                {{#each documentos}}
                    <div class="subregistro">
                        <p> {{ term }}: </p>
                        <img class="archivo-adjunto" src="{{img}}">
                    </div>
                {{/each}}
            </div>

        `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const documentos = await Promise.all(this.getImages());
        const noSoportados = this.getCantidadNoSoportados();
        this.data = {
            registro: this.registro,
            documentos,
            noSoportados
        };
    }


    getImages() {
        return this.registro.valor.documentos
            .filter(doc => mime.lookup(doc.ext).indexOf('image') > -1)
            .map(documento => {
                return new Promise(async (resolve, reject) => {
                    if (documento.id) {
                        const stream = await getArchivoAdjunto(documento.id);
                        const img = await streamToJpegDataUri(stream, { maxWidth: 1200, quality: 60 });
                        return resolve({ img, term: documento?.descripcion?.term });
                    }
                    return;
                });
            });
    }

    getCantidadNoSoportados() {
        return this.registro.valor.documentos.filter(x => mime.lookup(x.ext).indexOf('image') === -1).length;
    }
}
