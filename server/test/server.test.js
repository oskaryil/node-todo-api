const expect = require("expect");
const request = require("supertest");
const { ObjectID } = require("mongodb");
const faker = require("faker");

const { app } = require("./../server");
const { Todo } = require("./../models/todo");
const { User } = require("./../models/user");
const { todos, populateTodos, users, populateUsers } = require("./seed/seed");

beforeEach(populateUsers);
beforeEach(populateTodos);

describe("POST /todos", () => {
  it("should create a new todo", done => {
    let text = "Test todo text";

    request(app)
      .post("/todos")
      .send({ text })
      .expect(200)
      .expect(res => {
        expect(res.body.text).toBe(text);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.find({ text })
          .then(todos => {
            expect(todos.length).toBe(1);
            expect(todos[0].text).toBe(text);
            done();
          })
          .catch(e => done(e));
      });
  });

  it("should not create todo with invalid body data", done => {
    request(app).post("/todos").send({}).expect(400).end((err, res) => {
      if (err) {
        return done(err);
      }

      Todo.find()
        .then(todos => {
          expect(todos.length).toBe(2);
          done();
        })
        .catch(e => done(e));
    });
  });
});

describe("GET /todos", () => {
  it("should get all todos", done => {
    request(app)
      .get("/todos")
      .expect(200)
      .expect(res => {
        expect(res.body.todos.length).toBe(2);
      })
      .end(done);
  });
});

describe("GET /todos/:id", () => {
  it("should return todo doc", done => {
    request(app)
      .get(`/todos/${todos[0]._id.toHexString()}`)
      .expect(200)
      .expect(res => {
        expect(res.body.todo.text).toBe(todos[0].text);
      })
      .end(done);
  });

  it("should return 404 if todo not found", done => {
    // make sure you get a 404 back
    request(app)
      .get(`/todos/${new ObjectID().toHexString()}`)
      .expect(404)
      .end(done);
  });

  it("should return 404 for non-object ids", done => {
    // /todos/123
    request(app).get("/todos/123").expect(404).end(done);
  });
});

describe("DELETE /todos/:id", () => {
  it("should remove a todo", done => {
    let hexID = todos[1]._id.toHexString();

    request(app)
      .delete(`/todos/${hexID}`)
      .expect(200)
      .expect(res => {
        expect(res.body.todo._id).toBe(hexID);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.findById(hexID)
          .then(todo => {
            expect(todo).toNotExist();
            done();
          })
          .catch(e => {
            done(e);
          });
        // query database using findById toNotExist
        // expect(null).toNotExist();
      });
  });

  it("should return 404 if todo not found", done => {
    request(app)
      .delete(`/todos/${new ObjectID().toHexString()}`)
      .expect(404)
      .end(done);
  });

  it("should return 404 if ObjectID is invalid", done => {
    request(app).delete("/todos/123").expect(404).end(done);
  });
});

describe("PATCH /todos/:id", () => {
  it("should update the todo", done => {
    // grab id of first item
    let hexID = todos[0]._id.toHexString();
    let text = "Changed text";
    // update the text, set completed == true
    request(app)
      .patch(`/todos/${hexID}`)
      .send({
        text: text,
        completed: true
      })
      .expect(200)
      .expect(res => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(true);
        expect(res.body.todo.completedAt).toBeA("number");
      })
      .end(done);
    // 200
    // text is changed, completed is true, completedAt is a number .toBeA(number)
  });

  it("should clear completedAt when todo is not completed", done => {
    // grab id of second todo item
    let hexID = todos[1]._id.toHexString();
    let text = "Updated text";
    request(app)
      .patch(`/todos/${hexID}`)
      .send({
        text,
        completed: false
      })
      .expect(200)
      .expect(res => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(false);
        expect(res.body.todo.completedAt).toBe(null);
      })
      .end(done);
    //update text, set completed to false,
    // 200
    // text is changed, completed false, completedAt is null .toNotExist
  });
});

describe("GET /users/me", () => {
  it("should return user if authenticated", done => {
    request(app)
      .get("/users/me")
      .set("x-auth", users[0].tokens[0].token)
      .expect(200)
      .expect(res => {
        expect(res.body._id).toBe(users[0]._id.toHexString());
        expect(res.body.email).toBe(users[0].email);
      })
      .end(done);
  });

  it("should return 401 if not authenticated", done => {
    request(app)
      .get("/users/me")
      .expect(401)
      .expect(res => {
        expect(res.body).toEqual({});
      })
      .end(done);
  });
});

describe("POST /users", () => {
  it("should create a user", done => {
    let email = "example@example.com";
    let password = "123mnb!";

    request(app)
      .post("/users")
      .send({ email, password })
      .expect(200)
      .expect(res => {
        expect(res.headers["x-auth"]).toExist();
        expect(res.body._id).toExist();
        expect(res.body.email).toBe(email);
      })
      .end(err => {
        if (err) {
          return done(err);
        }

        User.findOne({ email })
          .then(user => {
            expect(user).toExist();
            expect(user.password).toNotBe(password);
            done();
          })
          .catch(e => done(e));
      });
  });
  it("should return validation errors if request invalid", done => {
    let invalidEmail = "invalid";
    let invalidPassword = "12345";

    request(app)
      .post("/users")
      .send({ email: invalidEmail, password: invalidPassword })
      .expect(400)
      .end(done);
  });

  it("should not create user if email in use", done => {
    let usedEmail = users[0].email;
    let password = "password";

    request(app)
      .post("/users")
      .send({ email: usedEmail, password })
      .expect(400)
      .end(done);
  });
});

describe("POST /users/login", () => {
  it("should log in user and return auth token", done => {
    request(app)
      .post("/users/login")
      .send({
        email: users[1].email,
        password: users[1].password
      })
      .expect(200)
      .expect(res => {
        expect(res.headers["x-auth"]).toExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.findById(users[1]._id)
          .then(user => {
            expect(user.tokens[0]).toInclude({
              access: "auth",
              token: res.headers["x-auth"]
            });
            done();
          })
          .catch(e => done(e));
      });
  });

  it("should reject invalid login", done => {
    request(app)
      .post("/users/login")
      .send({
        email: users[1],
        password: users[1].password + "1"
      })
      .expect(400)
      .expect(res => {
        expect(res.headers["x-auth"]).toNotExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.findById(users[1]._id)
          .then(user => {
            expect(user.tokens.length).toBe(0);
            done();
          })
          .catch(e => done(e));
      });
  });
});
