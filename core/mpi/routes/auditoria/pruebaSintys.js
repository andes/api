"use strict";
const express = require("express");
const servicioSintys_1 = require("../../../../utils/servicioSintys");
var router = express.Router();
router.get('/pacientesMatchSintys/', function (req, res, next) {
    var unPaciente = {
        "idPaciente": 327705,
        "documento": "50625600",
        "clusterId": 2,
        "estado": "validado",
        "nombre": "LUCAS DAVID",
        "apellido": "GONZALEZ OCAÑA",
        "contacto": [],
        "direccion": [
            {
                "valor": "",
                "codigoPostal": "",
                "ubicacion": {
                    "localidad": {},
                    "provincia": {
                        "nombre": "CABA",
                    },
                    "pais": {
                        "nombre": "Argentina",
                    },
                },
                "ranking": 1,
                "activo": true,
            }
        ],
        "sexo": "masculino",
        "genero": "masculino",
        "fechaNacimiento": "2010-09-10",
        "estadoCivil": "",
        "claveSN": "GNZLC20105062",
        "claveBlocking": [
            "GNSLLKS",
            "GNSLZK",
            "LKSDVD",
            "8645446544313",
            "8645446",
            "2"
        ],
        "identificadores": [
            {
                "entidad": "Sips",
                "valor": 327705.0
            }
        ],
        "relaciones": [],
        "financiador": [],
        "entidadesValidadoras": [
            "Sisa"
        ]
    };
    var servSintys = new servicioSintys_1.servicioSintys();
    console.log('antes del llamado a match');
    var val = servSintys.matchSintys(unPaciente);
    console.log('dps del llamado a match');
    console.log(val);
});
router.get('/pacienteSintys/:id', function (req, res, next) {
    var unDocumento = req.params.id;
    var servSintys = new servicioSintys_1.servicioSintys();
    var pacientesRes = [];
    var weights = {
        identity: 0.3,
        name: 0.3,
        gender: 0.1,
        birthDate: 0.3
    };
    var datos = servSintys.getPacienteSintys(unDocumento);
    Promise.all(pacientesRes).then(values => {
        console.log(values);
        pacientesRes.push(values);
        res.json(values);
    }).catch(err => {
        console.log(err);
        next(err);
    });
});
module.exports = router;
//# sourceMappingURL=pruebaSintys.js.map