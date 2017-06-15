import * as os from 'os';
import * as process from 'process';
import * as cp from 'child_process';


// Usar para mensajes postinstall
console.log('+-----------------------------+');
console.log('|                             |');
console.log('|   ¡Bienvenidos a ANDES!     |');
console.log('| ¡recordá lintear el código! |');
console.log('+-----------------------------+');

process.stdin.resume();
process.stdin.setEncoding('utf8');

console.log('Se requiere el paquete nodemon.');
console.log('¿Desea instalarlo? S/N:');
process.stdin.on('data', function (confirmar) {
    if (confirmar.toUpperCase() === 'S\n') {
        if (os.type() === 'Windows_NT') {
            cp.execSync('npm install -g nodemon');
        } else {
            cp.execSync('sudo npm install -g nodemon');
        }
        process.exit();
    } else {
        process.exit();
    }
});

