import * as express from 'express';
import { Minuta } from '../schemas/minuta';
import { Auth } from '../../../auth/auth.class';
import { MinutasLeidas } from '../schemas/minutasLeidas';
import * as mongoose from 'mongoose';

const router = express.Router();

router.post('/minutaLeidas', async (req, res, next) => {
    try {
        console.log("esto es el post",req.body)
        let options = {
            idMinuta: req.body.idMinuta,
            idUsuario:  req.body.idUsuario,
        }
        let minuta =  await MinutasLeidas.findOne(options)
        console.log(minuta);
        if(!minuta){
            const newMinuta = new MinutasLeidas(req.body);
            Auth.audit(newMinuta, req);
            let respuesta = await newMinuta.save();
            res.json(respuesta);
        }else{
            res.json({})
        }
       
    } catch (error) {
        return next(error);
    }
});

router.get('/minutaLeidas', async (req: any, res, next) => {
    try {
        let options = {}
        if(req.query.idUsuario){
            let id  = mongoose.Types.ObjectId(req.query.idUsuario); 
            options['idUsuario'] = id;
        }
        console.log(options)
        let data = await MinutasLeidas.find(options);
        res.json(data);
    } catch (error) {
        return next(error);
    }
});


export = router;
