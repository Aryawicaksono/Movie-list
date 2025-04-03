import express, { response } from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";

app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/movies`);
    res.render("index", { data: response.data });
  } catch (err) {
    console.error("Cannot get data from server", err);
    res.status(500).send("Cannot get data from server");
  }
});

app.get("/form", async (req, res) => {
  const categoryResponse = await axios.get(`${API_URL}/categories`);
  const directorResponse = await axios.get(`${API_URL}/directors`);
  res.render("form.ejs", {
    heading: "New Movies",
    submit: "Add",
    categories: categoryResponse.data,
    director: directorResponse.data,
    movie: {},
  });
});

app.get("/form/:id", async (req, res) => {
  try {
    const [movieResponse, categoryResponse, directorResponse] =
      await Promise.all([
        axios.get(`${API_URL}/movies/${req.params.id}`),
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/directors`),
      ]);

    // Ensure `movie` is a single object, not an array
    const movie = Array.isArray(movieResponse.data)
      ? movieResponse.data[0]
      : movieResponse.data;

    // Find related category and director objects
    const category = categoryResponse.data.find(
      (cat) => cat.id === movie?.category_id
    );
    const director = directorResponse.data.find(
      (dir) => dir.id === movie?.director_id
    );

    // Enrich the movie data with category and director information
    const enrichMovie = {
      ...movie,
      category: category?.category || "Unknown category",
      director: director?.director || "Unknown director",
    };

    // Log data passed to EJS for debugging
    // console.log("Data passed to EJS:", {
    //   heading: "Update Movies",
    //   submit: "Edit",
    //   movie: enrichMovie,
    // });

    // Render the form
    res.render("form", {
      heading: "Update Movies",
      submit: "Edit",
      movie: enrichMovie, // Pass the enriched movie details
      categories: categoryResponse.data, // Full list of categories
      directors: directorResponse.data, // Full list of directors
    });
  } catch (err) {
    console.error(
      "Error fetching form data:",
      err.message || err.response?.data
    );
    res.status(err.response?.status || 500).send("Failed to fetch form data.");
  }
});

app.post("/movies", async (req, res) => {
  const { title, director, categoryId } = req.body;
  if (!title) {
    return res.status(400).send("Title is required");
  } else if (!director) {
    return res.status(400).send("Director is required");
  } else if (!categoryId) {
    return res.status(400).send("Category Id is required");
  }
  try {
    const response = await axios.post(`${API_URL}/movies`, req.body);
    console.log(response.data);
    res.redirect("/");
  } catch (err) {
    console.error("Error while posting to api", err.response?.data);
    res.status(500).send("Failed to submit. Please try again later");
  }
});

app.post("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { title, year, rating, director, categoryId, review, image } = req.body;

  if (!title) {
    return res.status(400).send("Title is required");
  }
  if (!director) {
    return res.status(400).send("Director is required");
  }
  if (!categoryId) {
    return res.status(400).send("Category ID is required");
  }
  try {
    const payLoad = {
      title,
      year,
      rating,
      director,
      categoryId,
      review,
      image,
    };
    const response = await axios.put(`${API_URL}/edit/${id}`, payLoad);
    // console.log("response data", response);
    res.redirect("/");
  } catch (err) {
    console.error("Error updating the movie", err.mesage);
    res
      .status(err.response?.status || 500)
      .send(err.response?.data || "Internal Server Error");
  }
});

app.get("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.delete(`${API_URL}/delete/${id}`);
    res.redirect("/");
  } catch (err) {
    console.error("error while deleting");
    res.status(500).send("Internal Server Error");
  }
});
app.listen(port, () => {
  console.log(`app running at port ${port}`);
});
