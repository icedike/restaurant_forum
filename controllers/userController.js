const bcrypt = require('bcryptjs')
const db = require('../models')
const { User, Favorite, Comment, Restaurant, Like, Followship } = db
const imgur = require('imgur-node-api')
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID

const userController = {
  signUpPage: (req, res) => {
    return res.render('signup')
  },

  signUp: (req, res) => {
    const { name, email, password, passwordCheck } = req.body
    if (password !== passwordCheck) {
      req.flash('error_messages', '兩次密碼輸入不同！')
      return res.redirect('signup')
    }

    User.findOne({ where: { email } })
      .then(user => {
        if (user) {
          req.flash('error_messages', '信箱重複！')
          return res.redirect('/signup')
        }
        User.create({
          name,
          email,
          password: bcrypt.hashSync(password, bcrypt.genSaltSync(10), null)
        }).then(user => {
          return res.redirect('/signin')
        })
      })
  },

  signInPage: (req, res) => {
    return res.render('signin')
  },

  signIn: (req, res) => {
    req.flash('success_messages', '成功登入！')
    res.redirect('/restaurants')
  },

  logout: (req, res) => {
    req.flash('success_messages', '登出成功！')
    req.logout()
    res.redirect('/signin')
  },

  addFavorite: (req, res) => {
    return Favorite.create({
      UserId: req.user.id,
      RestaurantId: req.params.restaurantId
    })
      .then(restaurant => {
        return res.redirect('back')
      })
  },

  removeFavorite: (req, res) => {
    return Favorite.findOne({
      where: {
        UserId: req.user.id,
        RestaurantId: req.params.restaurantId
      }
    })
      .then((favorite) => {
        favorite.destroy()
          .then((restaurant) => {
            return res.redirect('back')
          })
      })
  },

  likeRestaurant: (req, res) => {
    return Like.create({
      UserId: req.user.id,
      RestaurantId: req.params.restaurantId
    })
      .then(like => {
        return res.redirect('back')
      })
  },

  unlikeRestaurant: (req, res) => {
    return Like.findOne({
      where: {
        UserId: req.user.id,
        RestaurantId: req.params.restaurantId
      }
    })
      .then(like => {
        like.destroy()
          .then(restaurant => {
            return res.redirect('back')
          })
      })
  },

  getUser: async (req, res) => {
    const profile = await User.findByPk(req.params.id)
    const self = profile.id === req.user.id
    const comments = await Comment.findAndCountAll({ include: Restaurant, where: { UserId: req.params.id } })
    const data = comments.rows.map(c => ({ id: c.Restaurant.id, image: c.Restaurant.image }))
    console.log('comment', data)
    return res.render('profile', { profile: profile.toJSON(), self, count: comments.count, data })
  },

  editUser: async (req, res) => {
    const profile = await User.findByPk(req.params.id)
    if (profile.id === req.user.id) {
      return res.render('editProfile', { profile: profile.toJSON() })
    } else {
      req.flash('error_messages', '不能修改別人的資料')
      return res.redirect('/restaurants')
    }
  },

  putUser: async (req, res) => {
    const profile = await User.findByPk(req.params.id)
    if (profile.id === req.user.id) {
      if (!req.body.name) {
        req.flash('error_messages', "name didn't exist")
        return res.redirect('back')
      }

      const { file } = req
      if (file) {
        imgur.setClientID(IMGUR_CLIENT_ID)
        imgur.upload(file.path, async (err, img) => {
          if (err) console.log(err)
          await profile.update({
            name: req.body.name,
            image: file ? img.data.link : profile.image
          })
          req.flash('success_messages', 'profile was successfully to update')
          res.redirect(`/users/${profile.id}`)
        })
      } else {
        await profile.update({ name: req.body.name })
        req.flash('success_messages', 'profile was successfully to update')
        res.redirect(`/users/${profile.id}`)
      }
    } else {
      req.flash('error_messages', '不能修改別人的資料')
      return res.redirect('/restaurants')
    }
  },

  getTopUser: (req, res) => {
    return User.findAll({
      include: [
        { model: User, as: 'Followers' }
      ]
    }).then(users => {
      users = users.map(user => ({
        ...user.dataValues,
        FollowerCount: user.Followers.length,
        isFollowed: req.user.Followings.map(d => d.id).includes(user.id)
      }))
      users = users.sort((a, b) => b.FollowerCount - a.FollowerCount)
      return res.render('topUser', { users })
    })
  },

  addFollowing: (req, res) => {
    return Followship.create({
      followerId: req.user.id,
      followingId: req.params.userId
    })
      .then(followship => {
        return res.redirect('back')
      })
  },

  removeFollowing: (req, res) => {
    return Followship.findOne({
      where: {
        followerId: req.user.id,
        followingId: req.params.userId
      }
    })
      .then(followship => {
        followship.destroy()
          .then(followship => {
            return res.redirect('back')
          })
      })
  }

}

module.exports = userController
