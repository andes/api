import * as os from 'os';
import * as process from 'process';
import * as util from 'util';
import * as cp from 'child_process';


// Usar para mensajes postinstall
console.log('+-----------------------------+');
console.log('|                             |');
console.log('|   ¡Bienvenidos a ANDES!     |');
console.log('|                             |');
console.log('+-----------------------------+');

process.stdin.resume();
process.stdin.setEncoding('utf8');

console.log('Se requiere el paquete nodemon.');
console.log('¿Desea instalarlo? S/N:');
process.stdin.on('data', (confirmar) => {
    // console.log('>>>', util.inspect(confirmar));
    if (confirmar.toUpperCase() === 'S\n') {
        if (os.type() === 'Windows_NT') {
            cp.execSync('npm install -g nodemon');
        } else {
            cp.execSync('sudo npm install -g nodemon');
        }
    }

});

process.stdout.on('end', () => {
    process.stdout.write(`Recordá ejecutar 'node-gyp rebuild' ;-)`);
    process.exit();
});

