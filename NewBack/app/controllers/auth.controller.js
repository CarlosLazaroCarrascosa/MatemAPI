const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");

exports.signup = (req, res) => {
  const user = new User({
    dni: req.body.dni,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8),
    scores: [0,0,0,0],
    counters: [0,0,0,0],
    averages: [0,0,0,0]
  });

  user.save((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    if (req.body.roles) { //si se especifica rol, se coge el especificado
      Role.find(
        {
          name: { $in: req.body.roles }
        },
        (err, roles) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }

          user.roles = roles.map(role => role._id);
          user.save(err => {
            if (err) {
              res.status(500).send({ message: err });
              return;
            }

            res.send({ message: "El usuario se ha registrado correctamente." });
          });
        }
      );
    } else { //en caso contrario es user
      Role.findOne({ name: "user" }, (err, role) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        user.roles = [role._id];
        user.save(err => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }

          res.send({ message: "El usuario se ha registrado correctamente." });
        });
      });
    }
    console.log("Id del usuario", user.id)
    console.log("DNI del usuario", user.dni)
    console.log("Email del usuario", user.email)
  });
};

exports.signin = (req, res) => {
  User.findOne({
    dni: req.body.dni
  })
    .populate("roles", "-__v")
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (!user) {
        return res.status(404).send({ message: "Usuario no encontrado." });
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Contraseña incorrecta."
        });
      }

      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: 86400 // 24 hours
      });

      var authorities = [];

      for (let i = 0; i < user.roles.length; i++) {
        authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
      }
      res.status(200).send({
        id: user._id,
        dni: user.dni,
        email: user.email,
        scores: user.scores,
        counters: user.counters,
        averages: user.averages,
        roles: authorities,
        accessToken: token
      });
    });
};