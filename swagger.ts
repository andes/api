// @jgabriel / 17/10/2017
// Esta definición no sé cómo entra en juego con swagger.json
// Hay que hacer un poco de limpieza aquí


// // swagger definition
// var swaggerDefinition = {
//     info: {
//         title: 'API ANDES',
//         version: '1.0.0',
//         description: 'APIs de tablas maestras ANDES',
//     },
//     host: 'localhost:3002',                                                                
//     basePath: '/api',
//     definitions: {
//         "referencia": {
//             "type": "object",
//             "properties": {
//                 "id":
//                 { "type": "string" },
//                 "nombre":
//                 { "type": "string" }
//             }
//         },
//         "ubicacion": {
//             "type": "object",
//             "properties": {
//                 "barrio": {
//                     $ref: '#/definitions/referencia'
//                 },
//                 "localidad": {
//                     $ref: '#/definitions/referencia'
//                 },
//                 "provincia": {
//                     $ref: '#/definitions/referencia'
//                 },
//                 "pais": {
//                     $ref: '#/definitions/referencia'
//                 }
//             }
//         },
//         "direccion": {
//             "type": "object",
//             "properties": {
//                 "valor":
//                 { "type": "string" },
//                 "codigoPostal":
//                 { "type": "string" },
//                 "ubicacion": {
//                     $ref: '#/definitions/ubicacion'
//                 },
//                 "ranking":
//                 { "type": "number" },
//                 "geoReferencia":
//                 {
//                     "type": "array",
//                     "items": { "type": "number" }
//                 },
//                 "ultimaActualizacion":
//                 { "type": "string", "format": "date" },
//                 "activo":
//                 { "type": "boolean" }
//             }
//         },
//         "contacto": {
//             "type": "object",
//             "properties": {
//                 "proposito":
//                 { "type": "String" },
//                 "nombre":
//                 { "type": "String" },
//                 "apellido":
//                 { "type": "String" },
//                 "tipo":
//                 {
//                     "type": "String",
//                     "enum": ["Teléfono Fijo", "Teléfono Celular", "Email"]
//                 },
//                 "valor":
//                 { "type": "string" },
//                 "activo":
//                 { "type": "boolean" }
//             }
//         }
//     }

// };

// // options for the swagger docs
// var options = {
//     // import swaggerDefinitions
//     swaggerDefinition: swaggerDefinition,
//     // path to the API docs
//     apis: [path.join(__dirname, '/routes/*.js')],

// };

// // initialize swagger-jsdoc
// var swaggerSpec = swaggerJSDoc(options);

// //serve swagger
// app.get('/swagger.json', function (req, res) {
//     res.setHeader('Content-Type', 'application/json');
//     res.send(swaggerSpec);
// });

// //Incluimos swagger-ui
// app.use('/api-docs', express.static(__dirname + '/api-docs'));

// export = app