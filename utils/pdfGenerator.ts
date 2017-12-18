let pdfkit = require('pdfkit');
let fs = require('fs');

export function informeLaboratorio(paciente, organizacion, protocolo, detalles): any {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit();
            // const path = './utils/pdf/';
            const ancho = 400;
            const limit = 30;
            const columna = 72;
            let sexo = paciente.sexo === 'F' ? 'Femenino' : paciente.sexo === 'M' ? 'Masculino' : 'Indefinido';

            // doc.pipe(fs.createWriteStream(path + ' Informe ' + data.paciente.apellido + ' ' + data.paciente.nombre + '.pdf'));
            // Header
            doc.fontSize(16)
            .text('Laboratorio: ' + organizacion.nombre);
            doc.moveDown();

            let posFinHeader = doc.y;
            doc.moveDown();

            doc.fontSize(10)
            .text('Paciente: ' + paciente.apellido + ', ' + paciente.nombre)
            .text('Sexo: ' + sexo)
            .text('Fecha de Nacimiento: ' + paciente.fechaNacimiento);
            doc.moveDown();

            // Recuadro datos paciente
            doc.rect(doc.x, posFinHeader, ancho , doc.y - posFinHeader)
            .dash(1, 5)
            .stroke();
            doc.moveDown();

            // Informe de resultados
            doc.fontSize(6)
            .text('Resultados')
            .text('Fecha: ' + protocolo.fecha)
            .text('Médico Solicitante: ' + protocolo.solicitante);
            doc.moveDown();
            let yTitle = doc.y;
            doc.text('GRUPO' + ' '.repeat(25), columna, yTitle);
            doc.text('ITEM' + ' '.repeat(26), columna * 2.5, yTitle);
            doc.text('RESULTADO' + ' '.repeat(21), columna * 4, yTitle);
            doc.text('REFERENCIA' + ' '.repeat(12), columna * 5, yTitle);
            doc.text('OBS' + ' '.repeat(27), columna * 6, yTitle);

            doc.moveDown();
            detalles.forEach(element => {
                let grupo = element.grupo ? element.grupo.length >= limit ? element.grupo.substring(0, limit) : element.grupo + ' '.repeat(limit - element.grupo.length) : ' '.repeat(limit);
                let item = element.item ? element.item.length >= limit ? element.item.substring(0, limit) : element.item + ' '.repeat(limit - element.item.length) : ' '.repeat(limit);
                let resultado = element.resultado ? element.resultado.length >= limit ? element.resultado.substring(0, limit) : element.resultado + ' '.repeat(limit - element.resultado.length) : ' '.repeat(limit);
                let valoresRef = element.valoresReferencia ? element.valoresReferencia.length >= limit ? element.valoresReferencia.substring(0, limit) : element.valoresReferencia + ' '.repeat(limit - element.valoresReferencia.length) : ' '.repeat(limit);
                let observaciones = element.observaciones ? element.observaciones.length >= limit ? element.observaciones.substring(0, limit) : element.observaciones + ' '.repeat(limit - element.observaciones.length) : ' '.repeat(limit);
                let x = columna;
                let y = doc.y;
                doc.text(grupo, x, y);
                doc.text(item, columna * 2.5, y);
                doc.text(resultado, columna * 4, y);
                doc.text(valoresRef, columna * 5, y);
                doc.text(observaciones, columna * 6, y);
            });

            doc.end();
            resolve(doc);
        } catch (ex) {
            reject(ex);
        }
    });
}
