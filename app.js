const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");

let db;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running");
    });
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};
initializeDbAndServer();

function checkPasswordLength(password) {
  if (password.length < 6) {
    return false;
  } else {
    return true;
  }
}

const authorization = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const jwtToken = authHeader.split(" ")[1];
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "merimaa", (err, payload) => {
      if (err) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        req.username = payload.username;
        req.user_id = payload.user_id;
        next();
      }
    });
  }
};

app.post("/register/", async (req, res) => {
  const { name, username, password, gender } = req.body;
  const existingUserQuery = `
    SELECT
        *
    FROM
        user
    WHERE
        username='${username}';`;

  const existingUser = await db.get(existingUserQuery);

  if (existingUser !== undefined) {
    res.status(400);
    res.send("User already exists");
  } else {
    const isValidPassword = checkPasswordLength(password);
    if (isValidPassword) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const addUserQuery = `
            INSERT INTO
                user(name,username,password,gender)
            VALUES
                ('${name}','${username}','${hashedPassword}','${gender}');`;

      await db.run(addUserQuery);
      res.status(200);
      res.send("User created successfully");
    } else {
      res.status(400);
      res.send("Password is too short");
    }
  }
});

app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const existingUserQuery = `
SELECT
    *
FROM
    user
WHERE
    username='${username}';`;

  const existingUser = await db.get(existingUserQuery);

  if (existingUser === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const isValidPassword = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (isValidPassword) {
      const payload = { username: username, user_id: existingUser.user_id };
      const jwtToken = await jwt.sign(payload, "merimaa");
      res.status(200);
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

app.get("/user/tweets/feed/", authorization, async (req, res) => {
  const { limit } = req.query;
  const getFeedQuery = `
  SELECT
    username,tweet,date_time AS dateTime
FROM
    user
INNER JOIN 
    tweet
ON user.user_id=tweet.user_id
LIMIT ${limit};`;

  const feedArray = await db.all(getFeedQuery);
  res.send(feedArray);
});

app.get("/user/following/", authorization, async (req, res) => {
  const { user_id } = req.user_id;
});
