import * as fs from 'fs';
import * as path from 'path';
import * as scss from 'node-sass';
import * as pdf from 'html-pdf';
import { HTMLComponent } from './html-component.class';

export class InformePDF extends HTMLComponent {
    template = `
    <!DOCTYPE html>
    <html>
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            {{#if css }}
                <style> {{{ css }}}  </style>
            {{/if}}

        </head>
        <body>
            {{#if header }}
                <header id="pageHeader"> {{{ header }}}  </header>
            {{/if}}

            {{{ body }}}

            {{#if footer }}
                <footer id="pageFooter"> {{{ footer }}} </footer>
            {{/if}}
        </body>
    </html>
    `;

    header: HTMLComponent;
    body: HTMLComponent;
    footer: HTMLComponent;

    style: string;
    stylesUrl: string[];


    async informe(options: pdf.CreateOptions = null) {
        const opciones = {
            ...this.getDefaultOptions(),
            ...(options || {})
        };
        const html = await this.render();
        return new Promise((resolve, reject) => {
            pdf.create(html, opciones).toFile((err, file) => {
                if (err) {
                    return reject(err);
                }
                return resolve(file.filename);
            });
        });
    }


    public async process() {
        const data: any = {};
        if (this.header) {
            data.header = await this.header.render();
        }
        if (this.footer) {
            data.footer = await this.footer.render();
        }
        data.body = await this.body.render();

        if (this.style) {
            data.css = this.style;
        } else if (this.stylesUrl?.length > 0) {
            data.css = this.renderSCSS();
        }
        this.data = data;
    }

    private renderSCSS() {
        const styles = this.stylesUrl.map((file) => {
            return scss.renderSync({
                file
            }).css;
        });

        return styles.join('\n');
    }

    private getDefaultOptions() {
        const defaultOptions: pdf.CreateOptions = {
            format: 'A4',
            border: {
                // default is 0, units: mm, cm, in, px
                top: '.25cm',
                right: '0cm',
                bottom: '3cm',
                left: '0cm'
            },
            header: {
                height: '7cm',
            },
            footer: {
                height: '1cm'
            }
        };
        return defaultOptions;
    }


}


export function getAssetsURL(filename) {
    return path.join(process.cwd(), filename);
}

export function loadImage(filename) {
    const realPath = path.join(process.cwd(), filename);
    const image = fs.readFileSync(realPath);
    return image.toString('base64');
}
