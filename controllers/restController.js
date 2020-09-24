const db = require('../models')
const { Restaurant, Category, User, Comment } = db

const pageLimit = 10

const restController = {
  getRestaurants: (req, res) => {
    let offset = 0
    const whereQuery = {}
    let categoryId = ''
    if (req.query.page) {
      offset = (req.query.page - 1) * pageLimit
    }
    if (req.query.categoryId) {
      categoryId = Number(req.query.categoryId)
      whereQuery['CategoryId'] = categoryId
    }
    Restaurant.findAndCountAll({ include: Category, where: whereQuery, offset, limit: pageLimit })
      .then(result => {
        const page = Number(req.query.page) || 1
        const pages = Math.ceil(result.count / pageLimit)
        const totalPage = Array.from({ length: pages }).map((item, index) => index + 1)
        const prev = page - 1 < 1 ? 1 : page - 1
        const next = page + 1 > pages ? pages : page + 1

        const data = result.rows.map(r => ({
          ...r.dataValues,
          description: r.dataValues.description.substring(0, 50),
          categoryName: r.Category.name,
          isFavorited: req.user.FavoritedRestaurants.map(d => d.id).includes(r.id),
          isLiked: req.user.LikedRestaurants.map(l => l.id).includes(r.id)
        }))
        Category.findAll({ raw: true, nest: true })
          .then(categories => {
            return res.render('restaurants', { restaurants: data, categories, categoryId, page, totalPage, prev, next })
          })
      })
  },
  getRestaurant: async (req, res) => {
    const restaurant = await Restaurant.findByPk(req.params.id, {
      include:
        [Category,
          { model: Comment, include: [User] },
          { model: User, as: 'FavoritedUsers' },
          { model: User, as: 'LikedUsers' }
        ]
    })
    await restaurant.increment('viewCounts')
    const isFavorited = restaurant.FavoritedUsers.map(r => r.id).includes(req.user.id)
    const isLiked = restaurant.LikedUsers.map(u => u.id).includes(req.user.id)
    return res.render('restaurant', { restaurant: restaurant.toJSON(), isFavorited, isLiked })
  },
  getFeeds: (req, res) => {
    return Restaurant.findAll({
      limit: 10,
      raw: true,
      nest: true,
      order: [['createdAt', 'DESC']],
      include: [Category]
    })
      .then(restaurants => {
        Comment.findAll({
          limit: 10,
          raw: true,
          nest: true,
          order: [['createdAt', 'DESC']],
          include: [User, Restaurant]
        })
          .then(comments => {
            return res.render('feeds', { restaurants, comments })
          })
      })
  },
  getDashboard: async (req, res) => {
    const restaurant = await Restaurant.findByPk(req.params.id, { include: [Comment, Category] })
    return res.render('dashboard', { restaurant: restaurant.toJSON() })
  },
  getTopRestaurant: async (req, res) => {
    let restaurants = await Restaurant.findAll(
      {
        include: [
          { model: User, as: 'FavoritedUsers' }
        ]
      })
    restaurants = restaurants.map(r => ({
      ...r.dataValues,
      isFavorited: req.user.FavoritedRestaurants.map(d => d.id).includes(r.id),
      FavoriteCount: r.FavoritedUsers.length
    }))

    restaurants = restaurants.sort((a, b) => b.FavoriteCount - a.FavoriteCount)
    restaurants = restaurants.slice(0, 10)
    return res.render('topRestaurant', { restaurants })
  }
}

module.exports = restController
