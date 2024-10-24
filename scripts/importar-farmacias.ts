import farmacia = require('../modules/farmacia/schemas/farmacia');
const fsp = require('fs/promises');
const fileFarmacias = '../api/modules/farmacia/csv/farmacias.csv';
import * as Provincia from '../../api/core/tm/schemas/provincia_model';
import * as localidad from '../../api/core/tm/schemas/localidad';

async function run(done) {
    try {
        // Leer el archivo CSV
        const dataFarmacia = await fsp.readFile(fileFarmacias, { encoding: 'utf8' });
        const dataFarmaciaArray: string[] = dataFarmacia.split(/\r?\n/);
        const provinciaFija = await Provincia.findById('57f3f3aacebd681cc2014c53');// id de Neuquén

        // Procesar cada fila del archivo CSV
        for (let i = 1; i < dataFarmaciaArray.length; i++) {
            try {
                const rowFarmacia: string[] = dataFarmaciaArray[i].split(',');

                const denominacion = rowFarmacia[0];
                const razonSocial = rowFarmacia[1];
                const cuit = rowFarmacia[2];

                const farmaciaNew = {
                    denominacion,
                    razonSocial,
                    cuit,
                    DTResponsable: rowFarmacia[5],
                    matriculaDTResponsable: parseNumber(rowFarmacia[6]),
                    disposicionAltaDT: rowFarmacia[26] === 'SI' ? true : false,
                    farmaceuticaAuxiliar: validarFarmaciasAuxiliares(rowFarmacia.slice(8, 17)),
                    horarios: armarHorarios(rowFarmacia.slice(17, 19)),
                    domicilio: await armarDomicilio(rowFarmacia.slice(3, 5), provinciaFija),
                    contactos: armarContacto(rowFarmacia.slice(19, 22)),
                    asociadoA: rowFarmacia[22] !== null || rowFarmacia[22] ? rowFarmacia[22] : '',
                    fechaRenovacion: rowFarmacia[23],
                    vencimientoHabilitacion: rowFarmacia[24],
                    disposicionHabilitacion: rowFarmacia[25],
                    gabineteInyenctables: rowFarmacia[26] === 'SI' ? true : false,
                    laboratoriosMagistrales: rowFarmacia[27] === 'SI' ? true : false,
                    expedientePapel: rowFarmacia[28],
                    expedienteGDE: rowFarmacia[29],
                    nroCaja: rowFarmacia[30],
                    disposiciones: armarDisposiciones(rowFarmacia.slice(31, 36)),
                    sancion: armarSancion(rowFarmacia.slice(36))
                };

                await farmacia.create(farmaciaNew);


            } catch (err) {
            }
        }

        // Llamar a done una vez que todas las farmacias han sido procesadas
        done();

    } catch (err) {
        done(err); // Si falla al leer el archivo o procesar el CSV
    }
}

function parseNumber(value: string): number | null {
    const parsedValue = parseInt(value, 10);
    return isNaN(parsedValue) ? null : parsedValue;
}

// que directamente devuelva el array con las farmacias auxiliares validas
function validarFarmaciasAuxiliares(auxiliar: any[]): any[] {
    const arrayFarmaciasAuxiliares: any[] = [];
    const arrayValidado: any[] = [];

    const farmaciaAuxiliar1 = {
        farmaceutico: auxiliar[0],
        matricula: parseNumber(auxiliar[1]),
        disposicionAlta: auxiliar[2],
    };
    arrayFarmaciasAuxiliares.push(farmaciaAuxiliar1);
    const farmaciaAuxiliar2 = {
        farmaceutico: auxiliar[3],
        matricula: parseNumber(auxiliar[4]),
        disposicionAlta: auxiliar[5],
    };
    arrayFarmaciasAuxiliares.push(farmaciaAuxiliar2);
    const farmaciaAuxiliar3 = {
        farmaceutico: auxiliar[6],
        matricula: parseNumber(auxiliar[7]),
        disposicionAlta: auxiliar[8],
    };
    arrayFarmaciasAuxiliares.push(farmaciaAuxiliar3);

    arrayFarmaciasAuxiliares.forEach((item) => {
        if (item.farmaceutico && item.matricula !== null) {
            arrayValidado.push(item);
        }
    });

    return arrayValidado;
}

async function armarDomicilio(auxiliar: any[], provinciaDefinida: any) {


    const buscarLocalidad = await localidad.find(
        {
            nombre: auxiliar[1],
            'provincia._id': provinciaDefinida._id
        },
        {
            _id: 1, // Proyección: solo incluir el _id
            nombre: 1 // Proyección: solo incluir el nombre
        }
    );
    const ubicacionDefinida = {
        provincia: {
            _id: provinciaDefinida._id,
            nombre: provinciaDefinida.nombre
        },
        localidad: {
            _id: buscarLocalidad.length > 0 ? buscarLocalidad[0]._id : '57f3f3aacebd681cc2014c53', // Acceder al primer elemento del array
            nombre: auxiliar[1]
        }
    };
    const domicilio = {
        valor: auxiliar[0],
        ubicacion: ubicacionDefinida
    };

    return domicilio;
}

function armarHorarios(auxiliar: any[]): String[] {
    const arrayValidado: String[] = [];

    const diaSemana = 'Lunes a Viernes: ' + auxiliar[0];
    arrayValidado.push(diaSemana);

    const diaSabado = 'Sabado: ' + auxiliar[0];
    arrayValidado.push(diaSabado);

    return arrayValidado;
}

function armarContacto(auxiliar: any[]): any[] {
    const arrayValidado: any[] = [];

    if (auxiliar[0] !== 'null') {
        const contactoAuxiliar1 = {
            tipo: 'celular',
            valor: auxiliar[0],
            activo: true,
        };
        arrayValidado.push(contactoAuxiliar1);
    }

    if (auxiliar[1] !== 'null') {

        const contactoAuxiliar2 = {
            tipo: 'email',
            valor: auxiliar[1],
            activo: true,
        };
        arrayValidado.push(contactoAuxiliar2);
    }

    if (auxiliar[2] !== 'null') {
        const contactoAuxiliar3 = {
            tipo: 'email',
            valor: auxiliar[2],
            activo: true,
        };
        arrayValidado.push(contactoAuxiliar3);
    }


    return arrayValidado;
}

function armarDisposiciones(auxiliar: any[]): any[] {
    const arrayValidado: any[] = [];

    for (let i = 0; i < auxiliar.length; i++) {
        if (auxiliar[i] !== 'null') {
            const disposicion = {
                descripcion: auxiliar[i]
            };
            arrayValidado.push(disposicion);
        }
    }

    return arrayValidado;
}
function armarSancion(auxiliar: any[]): any[] {
    const arrayValidado: any[] = [];

    for (let i = 0; i < auxiliar.length; i++) {
        if (auxiliar[i] !== 'null') {
            const sancion = {
                numero: auxiliar[i]
            };
            arrayValidado.push(sancion);
        }
    }

    return arrayValidado;
}
export = run;
