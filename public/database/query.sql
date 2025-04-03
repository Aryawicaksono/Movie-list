CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE directors(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
    director VARCHAR(100)
)

CREATE TABLE categories(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100)
)

INSERT INTO categories(category)
VALUES
('Historical Fiction'),
('Action'),
('Sci-Fi'),
('Comedy'),
('Adventure'),
('Drama'),
('Mystery'),
('Horror'),
('Thriller'),
('Romance'),
('Animation'),
('Anime');


CREATE TABLE movies(
    id UUID PRIMARY KEY DEFAULT uuid_generate-v4(),
    title VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL,
    year BIGINT,
    director_id UUID REFERENCES directors(id),
    category_id UUID REFERENCES categories(id),
    review TEXT,
    image VARCHAR(255),
    slug VARCHAR(255),
    custom_order SERIAL
)