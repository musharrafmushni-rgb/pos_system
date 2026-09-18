import Product from '../models/Product.js';

/**
 * Controller for Product Discovery:
 * - Listing with Search, Filters (Category, Price Range, Availability)
 * - Product Details
 * - Categories list
 */
export const productController = {
  /**
   * Get products with optional search, category, price, and availability filters.
   */
  async getProducts(req, res) {
    try {
      const { search, category, minPrice, maxPrice, inStock, sort } = req.query;

      const query = {};

      // 1. Search by name or description
      if (search && search.trim() !== '') {
        query.$or = [
          { name: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } }
        ];
      }

      // 2. Category filter
      if (category && category !== 'All' && category.trim() !== '') {
        query.category = category;
      }

      // 3. Price range filter
      if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {};
        if (minPrice !== undefined && minPrice !== '') {
          query.price.$gte = Number(minPrice);
        }
        if (maxPrice !== undefined && maxPrice !== '') {
          query.price.$lte = Number(maxPrice);
        }
      }

      // 4. Availability filter (available_quantity > 0: stock_quantity > reserved_quantity)
      if (inStock === 'true') {
        query.$expr = {
          $gt: [{ $subtract: ['$stock_quantity', '$reserved_quantity'] }, 0]
        };
      }

      // Sorting
      let sortOption = { createdAt: -1 };
      if (sort === 'price_asc') sortOption = { price: 1 };
      if (sort === 'price_desc') sortOption = { price: -1 };
      if (sort === 'name_asc') sortOption = { name: 1 };

      const products = await Product.find(query).sort(sortOption);

      res.json({
        success: true,
        count: products.length,
        products
      });
    } catch (error) {
      console.error('[ProductController] Error fetching products:', error);
      res.status(500).json({ success: false, message: 'Server error fetching products', error: error.message });
    }
  },

  /**
   * Get single product detail by ID.
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.json({
        success: true,
        product
      });
    } catch (error) {
      console.error('[ProductController] Error fetching product detail:', error);
      res.status(500).json({ success: false, message: 'Server error fetching product', error: error.message });
    }
  },

  /**
   * Get all distinct product categories.
   */
  async getCategories(req, res) {
    try {
      const categories = await Product.distinct('category');
      res.json({
        success: true,
        categories: ['All', ...categories]
      });
    } catch (error) {
      console.error('[ProductController] Error fetching categories:', error);
      res.status(500).json({ success: false, message: 'Server error fetching categories' });
    }
  }
};
