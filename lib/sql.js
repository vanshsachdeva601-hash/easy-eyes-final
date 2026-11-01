// Product ke saath uski average rating + review count (reviews table se) jodne ka SQL tukda
const ratingCols = (alias) =>
  `(SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = ${alias}.id) AS rating, ` +
  `(SELECT COUNT(*) FROM reviews WHERE product_id = ${alias}.id) AS reviewCount`;

module.exports = { ratingCols };
