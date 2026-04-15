from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)
DB = "todos.db"


def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )
    conn.commit()
    conn.close()


init_db()


@app.route("/")
def index():
    return render_template("index.html")


# Get all todos
@app.route("/api/todos", methods=["GET"])
def get_todos():
    conn = get_db()
    todos = conn.execute("SELECT * FROM todos ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(row) for row in todos])


# Add todo
@app.route("/api/todos", methods=["POST"])
def add_todo():
    data = request.json
    text = data.get("text")

    if not text:
        return jsonify({"error": "Text required"}), 400

    conn = get_db()
    cur = conn.execute("INSERT INTO todos (text) VALUES (?)", (text,))
    conn.commit()

    new_id = cur.lastrowid
    todo = conn.execute("SELECT * FROM todos WHERE id = ?", (new_id,)).fetchone()
    conn.close()

    return jsonify(dict(todo)), 201


# Update todo
@app.route("/api/todos/<int:id>", methods=["PUT"])
def update_todo(id):
    data = request.json

    conn = get_db()
    conn.execute(
        """
        UPDATE todos
        SET text = ?, completed = ?
        WHERE id = ?
    """,
        (data.get("text"), data.get("completed"), id),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True})


# Delete todo
@app.route("/api/todos/<int:id>", methods=["DELETE"])
def delete_todo(id):
    conn = get_db()
    conn.execute("DELETE FROM todos WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True})


# Clear completed
@app.route("/api/todos/clear_completed", methods=["DELETE"])
def clear_completed():
    conn = get_db()
    conn.execute("DELETE FROM todos WHERE completed = 1")
    conn.commit()
    conn.close()

    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True)
