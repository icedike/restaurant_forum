const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcryptjs')
const db = require('../models')

const { User, Restaurant } = db

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, (req, email, password, done) => {
  User.findOne({ where: { email } })
    .then(user => {
      if (!user) return done(null, false, req.flash('error_messages', '帳號不存在'))
      if (!bcrypt.compareSync(password, user.password)) return done(null, false, req.flash('error_messages', '密碼錯誤'))
      return done(null, user)
    })
}
))
passport.serializeUser((user, cb) => {
  cb(null, user.id)
})
passport.deserializeUser((id, cb) => {
  User.findByPk(id, {
    include: [{ model: Restaurant, as: 'FavoritedRestaurants' }]
  }).then(user => {
    user = user.toJSON()
    return cb(null, user)
  })
})

module.exports = passport
