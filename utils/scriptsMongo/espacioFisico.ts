import * as os from 'os';
import * as process from 'process';
import * as cp from 'child_process';
import * as mongoose from 'mongoose';


// Usar para mensajes postinstall
console.log('+-----------------------------+');
console.log('|       Importación de        |');
console.log('|      Espacios Físicos       |');
console.log('|            HPN              |');
console.log('+-----------------------------+');

console.log('\n\n');

console.log('En construcción');

process.exit();


process.stdin.resume();
process.stdin.setEncoding('utf8');

console.log('¿Ejecutar script? S/N:');
process.stdin.on('data', (confirmar) => {
    // console.log('>>>', util.inspect(confirmar));
    if (confirmar.toUpperCase() === 'S\n') {
        if (os.type() === 'Windows_NT') {
            cp.execSync('');
        } else {
            cp.execSync('');
        }
    }

});

process.stdout.on('end', () => {
    process.stdout.write(`Bye!`);
    process.exit();
});


let db: any = {};



// TODO: Refactor a sintaxis Mongoose
db.getCollection('espacioFisico').find({}).forEach(function (elem) {

    db.getCollection('espacioFisico').update(
        { _id: elem._id },
        {
            $set: {
                servicio: { nombre: elem.servicio || '', _id: new mongoose.Types.ObjectId() },
                sector: { nombre: elem.sector || '', _id: new mongoose.Types.ObjectId() },
                activo: true,
                descripcion: '',
                detalle: '',
                edificio: {
                    "_id": new mongoose.Types.ObjectId("589c578355bf4277035bcf2a"),
                    "direccion": {
                        "codigoPostal": "8300",
                        "ranking": null,
                        "ubicacion": {
                            "localidad": {
                                "nombre": "NEUQUEN",
                                "_id": new mongoose.Types.ObjectId("57f538a472325875a199a82d")
                            },
                            "provincia": {
                                "nombre": "Neuqu�n",
                                "_id": new mongoose.Types.ObjectId("57f3f3aacebd681cc2014c53")
                            },
                            "pais": {
                                "nombre": "Argentina",
                                "_id": new mongoose.Types.ObjectId("57f3b5c469fe79a598e6281f")
                            },
                            "_id": new mongoose.Types.ObjectId("589c578355bf4277035bcf2c")
                        },
                        "valor": "Buenos Aires 450",
                        "_id": new mongoose.Types.ObjectId("589c578355bf4277035bcf2b"),
                        "activo": true
                    },
                    "descripcion": "Central"
                },
                organizacion: {
                    "nombre": "HOSPITAL PROVINCIAL NEUQUEN - DR. EDUARDO CASTRO RENDON",
                    "_id": new mongoose.Types.ObjectId("57e9670e52df311059bc8964")
                }
            }
        }
    )
})