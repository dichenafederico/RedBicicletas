var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var Reserva = require('./reserva');
var crypto = require('crypto');
var Token = require('../models/token');
var mailer = require('../mailer/mailer');
var Schema = mongoose.Schema;

var bcrypt = require('bcrypt');
const saltRounds = 10;

const validateEmail = function(email) {
    const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email);
};

var usuarioSchema = new Schema({
    nombre: {
        type: String,
        trim: true,
        required: [true, 'El nombre es obligatorio']
    },
    email: {
        type: String,
        trim: true,
        required: [true, 'El email es obligatorio'],
        lowercase: true,
        unique: true,
        validate: [validateEmail, 'Por favor, ingrese el email válido'],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/]
    },
    password: {
        type: String,
        trim: true,
        required: [true, 'El password es obligatorio']
    },
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
    verificado: {
        type: Boolean,
        default: false
    },
    googleId: String,
    facebookId: String
});

usuarioSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};


usuarioSchema.plugin(uniqueValidator, {
    message: 'El {PATH} ya existe con otro usuario.'
});

usuarioSchema.pre('save', function(next) {
    if (this.isModified('password')) {
        this.password = bcrypt.hashSync(this.password, saltRounds);
    }
    next();
});

usuarioSchema.methods.reservar = function (biciID, desde, hasta, cb) {
    var reserva = new Reserva({
        desde: desde,
        hasta: hasta,
        bicicleta: biciID,
        usuario: this._id
    });

    console.log(reserva);
    reserva.save(cb);
}

usuarioSchema.methods.enviar_email_bienvenida = function(cb) {
    const token = new Token({
        _userId: this.id,
        token: crypto.randomBytes(16).toString('hex')
    });
    const email_destination = this.email;
    
    token.save(function(err) {
        if (err) {
            return console.log(err.message);
        }

        const mailOptions = {
            from: 'no-reply@redbicicletas.com',
            to: email_destination,
            subject: 'Verificacion de cuenta',
            text: 'Hola,\n\n' + 'Por favor, para verificar su cuenta haga click en el siguiente link: \n\n' + 'http://localhost:3000' + '\/token/confirmation\/' + token.token + '.\n'
        };

        mailer.sendMail(mailOptions, function(err) {
            if (err) {
                return console.log(err.message);
            }

            console.log('Se ha enviado un email de bienvenida a ' + email_destination + '.');
        });
    });
};

usuarioSchema.statics.findOneOrCreateByGoogle = function findOneOrCreate(
    condition,
    callback
) {
    const self = this;
    console.log(condition);
    self.findOne({
            $or: [{
                    'googleId': condition.id,
                },
                {
                    'email': condition.emails[0].value,
                },
            ],
        },
        (err, result) => {
            if (result) {
                callback(err, result);
            } else {
                console.log('------------CONDITION-------------');
                console.log(condition);
                let values = {};
                values.googleId = condition.id;
                values.email = condition.emails[0].value;
                values.nombre = condition.displayName || 'SIN NOMBRE';
                values.verificado = true;
                values.password = condition._json.etag; //crypto.randomBytes(16).toString('hex'); //condition._json.etag;
                console.log('------------VALUES----------');
                console.log(values);
                self.create(values, (err, result) => {
                    if (err) {
                        console.log(err);
                    }
                    return callback(err, result);
                });
            }
        }
    );
};

usuarioSchema.statics.findOneOrCreateByFacebook = function findOneOrCreateByFacebook(
        condition,
        callback
    ) {
        const self = this;
        console.log(condition);
        self.findOne({
                $or: [{
                        'facebookId': condition.id,
                    },
                    {
                        'email': condition.emails[0].value,
                    },
                ],
            },
            (err, result) => {
                if (result) {
                    callback(err, result);
                } else {
                    console.log('--------------- CONDITION ---------------');
                    console.log(condition);
                    let values = {};
                    values.facebookId = condition.id;
                    values.email = condition.emails[0].value;
                    values.nombre = condition.displayName || 'SIN NOMBRE';
                    values.verificado = true;
                    values.password = crypto.randomBytes(16).toString('hex');//condition._json.etag;
                    console.log('------------ VALUES -----------');
                    console.log(values);
                    self.create(values, (err, result) => {
                        if (err) {
                            console.log(err);
                        }
                        return callback(err, result);
                    });
                }
            }
        );
    };


module.exports = mongoose.model('Usuario', usuarioSchema);