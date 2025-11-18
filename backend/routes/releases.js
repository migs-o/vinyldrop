const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// GET /api/releases - Get all releases with filters
router.get('/', async (req, res) => {
  try {
    const { 
      genre, 
      format, 
      sort = 'date', 
      limit = 50, 
      offset = 0,
      search 
    } = req.query;

    let sql = 'SELECT * FROM releases WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Filter by genre
    if (genre && genre !== 'all') {
      sql += ` AND $${paramCount} = ANY(genres)`;
      params.push(genre);
      paramCount++;
    }

    // Filter by format
    if (format && format !== 'all') {
      sql += ` AND EXISTS (
        SELECT 1 FROM unnest(formats) f 
        WHERE f ILIKE $${paramCount}
      )`;
      params.push(`%${format}%`);
      paramCount++;
    }

    // Search
    if (search) {
      sql += ` AND (
        artist ILIKE $${paramCount} OR 
        album ILIKE $${paramCount + 1} OR
        label ILIKE $${paramCount + 2}
      )`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramCount += 3;
    }

    // Sorting
    switch (sort) {
      case 'artist':
        sql += ' ORDER BY artist ASC';
        break;
      case 'price':
        sql += ' ORDER BY price ASC NULLS LAST';
        break;
      case 'reddit':
        sql += ' ORDER BY reddit_score DESC NULLS LAST';
        break;
      case 'date':
      default:
        sql += ' ORDER BY posted_at DESC';
    }

    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM releases WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit/offset
    const countResult = await query(countSql, countParams);

    res.json({
      releases: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

// GET /api/releases/:id - Get single release
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM releases WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Release not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching release:', error);
    res.status(500).json({ error: 'Failed to fetch release' });
  }
});

// GET /api/stats - Get statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_releases,
        COUNT(DISTINCT artist) as total_artists,
        COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as with_price,
        COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as with_cover,
        AVG(reddit_score) as avg_reddit_score
      FROM releases
    `);

    const topGenres = await query(`
      SELECT genre, COUNT(*) as count
      FROM releases, unnest(genres) as genre
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      ...stats.rows[0],
      top_genres: topGenres.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;