const db = require('../../models')
const { Restaurant, Category } = db
const adminController = {
  getRestaurants: (req, res) => {
    return Restaurant.findAll({ raw: true, nest: true, include: [Category] }).then(restaurants => {
      return res.json({ restaurants: restaurants })
    })
  }
}
module.exports = adminController