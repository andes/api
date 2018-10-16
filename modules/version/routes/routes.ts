import * as express from 'express';
import { NotificationService } from '../../mobileApp/controller/NotificationService';

let router = express.Router();

router.get('/', (req, res) => {
    let datos = {
        account: {
            "_id": "5a96b9613fa10902aac38745",
            "nombre": "HUGO HECTOR",
            "apellido": "FERNANDEZ",
            "email": "hugofernandeznqn@gmail.com",
            "password": "$2a$05$V3w49csF9W6dOBmPZRQGJOV7VdYnIBmQTVkN6SqqPUf2Cqjd7lJj2",
            "telefono": "2995290357",
            "envioCodigoCount": 0,
            "nacionalidad": "Argentina",
            "documento": "27381849",
            "sexo": "masculino",
            "genero": "masculino",
            "codigoVerificacion": null,
            "expirationTime": null,
            "devices": [
                {
                    "session_id": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVhOTZlYTA0ZmI4M2YxNGIzYmEyOWUxZiIsInVzdWFyaW8iOnsibm9tYnJlIjoiSFVHTyBIRUNUT1IgRkVSTkFOREVaIiwiZW1haWwiOiJodWdvZmVybmFuZGV6bnFuQGdtYWlsLmNvbSJ9LCJwZXJtaXNvcyI6W10sInBhY2llbnRlcyI6W3siaWQiOiI1OGQ5MGQ2ZjBiYjFhOTZiMjU0ZDk4NzciLCJhZGRlZEF0IjoiMjAxOC0wMi0yOFQxNDoxNDo1Ny43MzFaIiwiX2lkIjoiNWE5NmI5NjEzZmExMDkwMmFhYzM4NzQ2IiwicmVsYWNpb24iOiJwcmluY2lwYWwifV0sIm9yZ2FuaXphY2lvbiI6bnVsbCwiYWNjb3VudF9pZCI6IjVhOTZiOTYxM2ZhMTA5MDJhYWMzODc0NSIsInR5cGUiOiJwYWNpZW50ZS10b2tlbiIsImlhdCI6MTUxOTgzOTc0OCwiZXhwIjoxNTIwNzAzNzQ4fQ.cwC0jbGl8eFy9fyNy6S0sHivFSVUto5pu1thFsHiDcc",
                    "app_version": 8,
                    "device_type": "Android 7.0",
                    "device_id": "f2Izwf23cxw:APA91bFAuFFdNgSASJWDWupiz1VdGjTX94zyKep86HT84X3HY__5FSn0IL95VZ64IcG7xmjtDoN3t1ZiHPRWNX19bIXSu92y5hufbmI8wvP91bqZ0NX_-ZWRuW0GLf291X8FlrgNgyEQ"
                },
                {

                    "session_id": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVhYTg0OGI2NjZlNzdlMzI1MWU5NmMyMyIsInVzdWFyaW8iOnsibm9tYnJlIjoiSFVHTyBIRUNUT1IgRkVSTkFOREVaIiwiZW1haWwiOiJodWdvZmVybmFuZGV6bnFuQGdtYWlsLmNvbSJ9LCJwZXJtaXNvcyI6W10sInBhY2llbnRlcyI6W3siaWQiOiI1OGQ5MGQ2ZjBiYjFhOTZiMjU0ZDk4NzciLCJhZGRlZEF0IjoiMjAxOC0wMi0yOFQxNDoxNDo1Ny43MzFaIiwiX2lkIjoiNWE5NmI5NjEzZmExMDkwMmFhYzM4NzQ2IiwicmVsYWNpb24iOiJwcmluY2lwYWwifV0sIm9yZ2FuaXphY2lvbiI6bnVsbCwiYWNjb3VudF9pZCI6IjVhOTZiOTYxM2ZhMTA5MDJhYWMzODc0NSIsInR5cGUiOiJwYWNpZW50ZS10b2tlbiIsImlhdCI6MTUyMDk3ODEwMiwiZXhwIjoxNTIxODQyMTAyfQ.QwviOyVNQvSN4TsVBArOrZpPBaEmFTwiBE_Q1gVEvUo",
                    "app_version": 8,
                    "device_type": "Android 7.0",
                    "device_id": "e006mqHHQ8c:APA91bEAFHkKlFiiDYkGvTBC6nHXn3hYkzgC4-BYZsGf4_7zB_mLBKlo0lJyazgUW3IbcynfPB5SrnP_u5RHNIP2WdR7F_hmTds_A5sOD1Rr2NcbVd-6HbHTVXGrPcN4qZ-acNgJz3vb"
                },
                {
                    "device_id": null,
                    "device_type": "Android 7.0",
                    "app_version": 1,
                    "session_id": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjViODViNTgzYWYwYTcwNDIyOTdjMjMzNSIsInVzdWFyaW8iOnsibm9tYnJlIjoiSFVHTyBIRUNUT1IgRkVSTkFOREVaIiwiZW1haWwiOiJodWdvZmVybmFuZGV6bnFuQGdtYWlsLmNvbSJ9LCJwZXJtaXNvcyI6W10sInBhY2llbnRlcyI6W3sicmVsYWNpb24iOiJwcmluY2lwYWwiLCJpZCI6IjU4ZDkwZDZmMGJiMWE5NmIyNTRkOTg3NyIsImFkZGVkQXQiOiIyMDE4LTAyLTI4VDE0OjE0OjU3LjczMVoiLCJfaWQiOiI1YTk2Yjk2MTNmYTEwOTAyYWFjMzg3NDYifV0sIm9yZ2FuaXphY2lvbiI6bnVsbCwiYWNjb3VudF9pZCI6IjVhOTZiOTYxM2ZhMTA5MDJhYWMzODc0NSIsInR5cGUiOiJwYWNpZW50ZS10b2tlbiIsImlhdCI6MTUzNTQ4OTQxMSwiZXhwIjoxNTM2MzUzNDExfQ.kTK7JDuQ6uBSl5TzxmWuiYPJvBDyf25YiqZKV6Sc0wA"
                },
                {
                    "device_id": null,
                    "device_type": "Android 8.0.0",
                    "app_version": 1,
                    "session_id": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjViYjRkYjI0MDUzZTI4Mzc0MGIyY2IxOSIsInVzdWFyaW8iOnsibm9tYnJlIjoiSFVHTyBIRUNUT1IgRkVSTkFOREVaIiwiZW1haWwiOiJodWdvZmVybmFuZGV6bnFuQGdtYWlsLmNvbSJ9LCJwZXJtaXNvcyI6W10sInBhY2llbnRlcyI6W3sicmVsYWNpb24iOiJwcmluY2lwYWwiLCJpZCI6IjU4ZDkwZDZmMGJiMWE5NmIyNTRkOTg3NyIsImFkZGVkQXQiOiIyMDE4LTAyLTI4VDE0OjE0OjU3LjczMVoiLCJfaWQiOiI1YTk2Yjk2MTNmYTEwOTAyYWFjMzg3NDYifV0sIm9yZ2FuaXphY2lvbiI6bnVsbCwiYWNjb3VudF9pZCI6IjVhOTZiOTYxM2ZhMTA5MDJhYWMzODc0NSIsInR5cGUiOiJwYWNpZW50ZS10b2tlbiIsImlhdCI6MTUzODU3OTIzNiwiZXhwIjoxNTM5NDQzMjM2fQ.2ucHVkhpkrAlShWu3hMykpb4Nf0ReA4XWZ-4rXwoWx0",

                }
            ],
            "permisos": [],
            "activacionApp": true,
            "estadoCodigo": true,
            "pacientes": [
                {
                    "id": "58d90d6f0bb1a96b254d9877",
                    "_id": "5a96b9613fa10902aac38746",
                    "relacion": "principal"
                }
            ],
        },
        campania: {
            "_id": "5bc0d97502658be74e65b23c",
            "asunto": "Octubre mes de Sensibilización y prevención del Cáncer de Mama",
            "cuerpo": "Si tenés entre 50 y 70 años y no te hiciste una mamografía en los últimos 2 años, acércate a un centro de salud para solicitarla.",
            "link": "http://www.saludneuquen.gob.ar/octubre-mes-de-sensibilizacion-y-prevencion-del-cancer-de-mama/",
            "imagen": "",
            "target": {
                "sexo": "femenino",
                "grupoEtareo": {
                    "desde": 50,
                    "hasta": 70
                }
            },
            "vigencia": {
                "desde": new Date("2018-10-01T00:00:00.000-03:00"),
                "hasta": new Date("2018-10-31T00:00:00.000-03:00")
            },
            "fechaPublicacion": new Date("2017-10-16T00:00:00.582-03:00")

        }
    };
    NotificationService.notificarCampaniaSalud(datos);
    res.json({
        version: require('../../../package.json').version
    });
});

export = router;
