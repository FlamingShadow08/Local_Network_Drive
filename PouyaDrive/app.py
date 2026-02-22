from flask import Flask, render_template, request, redirect, send_from_directory, abort
import os
import shutil
from werkzeug.utils import secure_filename

app = Flask(__name__)

ROOT_DIR = os.path.abspath("drive")
os.makedirs(ROOT_DIR, exist_ok=True)


def safe_path(subpath: str = "") -> str:
    """Prevent path traversal"""
    subpath = subpath.strip("/\\")
    fullpath = os.path.abspath(os.path.join(ROOT_DIR, subpath))
    if not fullpath.startswith(ROOT_DIR):
        abort(403, "Invalid path")
    return fullpath


@app.route("/", methods=["GET", "POST"])
def index():
    path = request.args.get("path", "").strip("/")
    current_dir = safe_path(path)

    if request.method == "POST":
        file = request.files.get("file")
        if file and file.filename:
            filename = secure_filename(file.filename)
            file.save(os.path.join(current_dir, filename))

        folder_name = request.form.get("folder", "").strip()
        if folder_name:
            os.makedirs(os.path.join(current_dir, secure_filename(folder_name)), exist_ok=True)

        return redirect(request.url)

    try:
        entries = sorted(os.listdir(current_dir))
    except FileNotFoundError:
        abort(404, "Directory not found")

    items = [
        {"name": name, "is_dir": os.path.isdir(os.path.join(current_dir, name))}
        for name in entries
    ]

    parent = "/".join(path.split("/")[:-1]) if path else ""

    return render_template(
        "index.html",
        items=items,
        path=path,
        parent=parent
    )


@app.route("/download")
def download():
    path = request.args.get("path", "").strip("/")
    filename = request.args.get("file")
    if not filename:
        abort(400, "Missing file parameter")

    directory = safe_path(path)
    return send_from_directory(directory, filename, as_attachment=True)


@app.route("/delete", methods=["POST"])
def delete():
    path = request.form.get("path", "").strip("/")
    name = request.form.get("name")
    if not name:
        abort(400, "Missing name parameter")

    target = os.path.join(safe_path(path), name)

    if os.path.isdir(target):
        shutil.rmtree(target, ignore_errors=True)
    elif os.path.isfile(target):
        os.remove(target)
    else:
        abort(404, "File or folder not found")

    return redirect(f"/?path={path}")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4030, debug=True)