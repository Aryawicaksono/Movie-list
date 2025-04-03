import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import { fileLoader } from "ejs";

dotenv.config();

const app = express();
const db = new pg.Client({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  port: process.env.PORT,
});
db.connect();

const port = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const slugify = (title) => {
  return title
    .toLowerCase() // Convert to lowercase
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters (e.g., ":")
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .trim(); // Remove trailing spaces
};

app.get("/movies", async (req, res) => {
  try {
    const response = await db.query(
      `SELECT 
      movies.id, 
      movies.title, 
      movies.image, 
      movies.rating, 
      movies.review, 
      movies.year, 
      movies.slug, 
      directors.director, 
      categories.category AS category_name, 
      categories.id AS category_id 
      FROM movies 
      JOIN directors ON directors.id = movies.director_id 
      JOIN categories ON categories.id = movies.category_id ORDER BY custom_order ASC`
    );
    res.status(200).json(response.rows);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/movies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await db.query(
      `SELECT movies.id,movies.title,movies.rating,movies.year,movies.director_id,movies.category_id,movies.review,movies.image,movies.slug,movies.custom_order,directors.director,categories.category FROM movies JOIN directors ON directors.id=director_id
      JOIN categories ON categories.id=category_id
      WHERE movies.id=$1`,
      [id]
    );
    if (response.rows.length === 0) {
      return res.status(404).send("Movie not found");
    }
    res.status(200).json(response.rows);
  } catch (err) {
    console.error("Database query error", err);
    res.status(500).send("Internal Database Error");
  }
});

app.get("/movies/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const response = await db.query(
      `
      SELECT *
      FROM movies
      JOIN directors ON directors.id = director_id
      JOIN categories ON categories.id = category_id
      WHERE movies.slug = $1
    `,
      [slug]
    );

    if (response.rows.length === 0) {
      return res.status(404).send("Movie not found");
    }

    res.status(200).json(response.rows[0]);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/categories", async (req, res) => {
  try {
    const response = await db.query(`SELECT * FROM categories`);
    res.status(200).json(response.rows);
  } catch (err) {
    console.error("Database query error", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/directors", async (req, res) => {
  try {
    const response = await db.query(`SELECT * FROM directors`);
    res.status(200).json(response.rows);
  } catch (err) {
    console.error("Database Query Error", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/movies", async (req, res) => {
  const { title, director, categoryId, image, review, year, rating } = req.body;
  console.log("request body: ", req.body);
  // console.log("Received data:", req.body);
  // console.log("Title:", title);
  // console.log("Director:", director);
  // console.log("Category:", category);

  // Map category_id to category for validation and processing

  if (!title) {
    return res.status(400).send("Title is required");
  } else if (!director) {
    return res.status(400).send("Director is required");
  } else if (!categoryId) {
    return res.status(400).send("Category Id is required");
  }

  try {
    const directorResponse = await db.query(
      `SELECT id FROM directors WHERE director=$1`,
      [director]
    );

    const director_id = directorResponse.rows.length
      ? directorResponse.rows[0].id
      : (
          await db.query(
            `INSERT INTO directors(director) VALUES ($1) RETURNING id`,
            [director]
          )
        ).rows[0].id;

    const categoryResponse = await db.query(
      `SELECT id FROM categories WHERE id=$1`,
      [categoryId]
    );
    if (categoryResponse.rows.length === 0) {
      return res.status(400).send("Category not in database");
    }
    const category_id = categoryResponse.rows[0].id;

    const movieCheckResponse = await db.query(
      `SELECT * FROM movies WHERE LOWER(title)=$1 AND director_id=$2 AND category_id=$3`,
      [title.toLowerCase(), director_id, category_id]
    );

    if (movieCheckResponse.rows.length > 0) {
      return res.status(400).send("This movie already exists");
    }

    const slug = slugify(title);
    const movieResponse = await db.query(
      `INSERT INTO movies(title, year, rating, director_id, category_id, review, image, slug)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, year, rating, director_id, category_id, review, image, slug]
    );
    res.status(201).json({
      message: "Movie successfully added",
      movie: movieResponse.rows[0],
    });
  } catch (err) {
    console.error("Database insert error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/directors", async (req, res) => {
  try {
    const { director } = req.body;
    if (!director) {
      return res.status(400).send("Director is required");
    }
    const response = await db.query(
      `INSERT INTO directors (director) VALUES($1)`,
      [director]
    );
    res.status(201).json(response.rows);
  } catch (err) {
    console.error("Database Query Error", err);
    res.status(500).send("Internal Server Error");
  }
});

app.put("/edit/:id", async (req, res) => {
  const { id } = req.params;
  const { title, year, rating, director, categoryId, review, image } = req.body;
  // console.log("Request Body:", req.body);
  // console.log("Keys in Request Body:", Object.keys(req.body)); // Check all keys
  // console.log("Director Field:", req.body.director);
  if (!title) {
    return res.status(400).send("Title is required");
  } else if (!director) {
    return res.status(400).send("Director is required");
  } else if (!categoryId) {
    return res.status(400).send("Category Id is required");
  }

  try {
    let director_id;

    const directorResponse = await db.query(
      `SELECT id FROM directors WHERE director=$1`,
      [director]
    );

    if (directorResponse.rows.length > 0) {
      director_id = directorResponse.rows[0].id;
    } else {
      const newDirector = await db.query(
        `INSERT INTO directors(director) VALUES($1) RETURNING id`,
        [director]
      );
      director_id = newDirector.rows[0].id;
    }

    const categoryResponse = await db.query(
      `SELECT id FROM categories WHERE id=$1`,
      [categoryId]
    );
    if (categoryResponse.rows.length === 0) {
      return res.status(400).send("Invalid category Id");
    }

    const updatedField = [];
    const values = [];
    let index = 1;

    if (title !== undefined) {
      const slug = slugify(title);
      updatedField.push(`slug=$${index++}`);
      updatedField.push(`title=$${index++}`);
      values.push(slug, title);
    }
    if (year !== undefined) {
      updatedField.push(`year=$${index++}`);
      values.push(year);
    }
    if (rating !== undefined) {
      updatedField.push(`rating=$${index++}`);
      values.push(rating);
    }
    if (review !== undefined) {
      updatedField.push(`review=$${index++}`);
      values.push(review);
    }
    if (image !== undefined) {
      updatedField.push(`image=$${index++}`);
      values.push(image);
    }

    updatedField.push(`director_id=$${index++}`);
    updatedField.push(`category_id=$${index++}`);
    values.push(director_id, categoryId);

    // console.log("Updated Fields:", updatedField);
    // console.log("Values:", values);

    const query = `UPDATE movies SET ${updatedField.join(
      ","
    )} WHERE id=$${index} RETURNING *`;
    values.push(id);

    const updateResponse = await db.query(query, values);

    if (updateResponse.rows.length === 0) {
      return res.status(404).send("Movie not found");
    }

    res.status(200).json({
      message: "Movie has been updated successfully",
      movie: updateResponse.rows[0],
    });
  } catch (err) {
    console.error("Error while updating the movie", err);
    res.status(500).send("Internal Server Error");
  }
});

app.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    //step1: find director_id from selected movie
    const movieResponse = await db.query(
      `SELECT director_id FROM movies WHERE id=$1`,
      [id]
    );
    if (movieResponse.rows.length === 0) {
      return res.status(404).send("Movie is not found");
    }
    const director_id = movieResponse.rows[0].director_id;
    //step2: Delete the chosen movie from movies table
    await db.query(`DELETE FROM movies WHERE id=$1 RETURNING *`, [id]);
    //step3:check if director_id still refreneced by any movies
    const directorCheck = await db.query(
      `SELECT 1 FROM movies WHERE director_id=$1`,
      [director_id]
    );
    //step4: if no reference exist,delete the director in directors table
    if (directorCheck.rows.length === 0) {
      await db.query(`DELETE FROM directors WHERE id=$1`, [director_id]);
    }

    res.status(200).send("Movie and unused director succesfully deleted");
  } catch (err) {
    console.error("Error while deleting movies", err.message);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log("server running on port " + port);
});
