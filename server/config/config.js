let env = process.env.NODE_ENV || "development";

if (env === "development" || env === "test") {
  let config = require("./config.json");
  let envConfig = config[env];

  Object.keys(envConfig).forEach(key => {
    process.env[key] = envConfig[key];
  });
}

// if (env === "development") {
//   process.env.PORT = 3000;
//   process.env.MONGODB_URI = "mongodb://localhost/TodoApp";
// } else if (env === "test") {
//   process.env.PORT = 3000;
//   process.env.MONGODB_URI = "mongodb://localhost/TodoAppTest";
// }
