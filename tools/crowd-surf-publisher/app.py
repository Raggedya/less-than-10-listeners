import hashlib
import json
import mimetypes
import os
import re
import subprocess
import tempfile
import threading
import webbrowser
from pathlib import Path
from urllib.parse import urlparse

import qrcode
import requests
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageTk
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk


APP_NAME = "Crowd Surf Publisher"
APP_VERSION = "1.0.0"
API_ROOT = "https://crowd-surf-publisher.raggedya.chatgpt.site"
CTA_TYPES = ["Spotify", "Bandcamp", "Instagram", "Facebook", "TikTok", "YouTube", "Tickets", "Events", "Merch", "Website", "Other"]
CONFIG_DIR = Path(os.environ.get("APPDATA", Path.home())) / "CrowdSurfPublisher"
CONFIG_FILE = CONFIG_DIR / "settings.json"


def slugify(value):
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:64] or "gig"


def valid_url(value):
    try:
        parsed = urlparse(value)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def load_font(size):
    candidates = [
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "arialbd.ttf",
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "impact.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(str(path), size)
        except OSError:
            pass
    return ImageFont.load_default()


def fit_cover(image, size):
    target_w, target_h = size
    ratio = max(target_w / image.width, target_h / image.height)
    resized = image.resize((max(1, int(image.width * ratio)), max(1, int(image.height * ratio))), Image.Resampling.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def draw_centered(draw, text, y, font, fill, width=1200, stroke=0, stroke_fill="#000000"):
    box = draw.textbbox((0, 0), text, font=font, stroke_width=stroke)
    x = (width - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=font, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)


def make_preview(art_path, title, output_path):
    art = Image.open(art_path).convert("RGB")
    canvas = fit_cover(art, (1200, 630))
    canvas = ImageEnhance.Contrast(canvas).enhance(1.08)
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 0, 1200, 630), fill=(5, 2, 10, 95))
    od.rectangle((0, 380, 1200, 630), fill=(5, 2, 10, 190))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(canvas)
    title_text = title.upper()
    size = 96
    font = load_font(size)
    while size > 38 and draw.textbbox((0, 0), title_text, font=font, stroke_width=3)[2] > 1080:
        size -= 4
        font = load_font(size)
    draw_centered(draw, title_text, 414, font, "#f6f23d", stroke=4)
    draw_centered(draw, "AT THE GIG WITH AGGITS", 540, load_font(34), "#ffffff", stroke=2)
    canvas.convert("RGB").save(output_path, "JPEG", quality=92, optimize=True)


def extract_palette(art_path):
    image = Image.open(art_path).convert("RGB")
    image.thumbnail((180, 180))
    colours = image.quantize(colors=8, method=Image.Quantize.MEDIANCUT).convert("RGB").getcolors(180 * 180)
    ranked = sorted(colours or [], reverse=True)
    chosen = []
    for _, colour in ranked:
        if max(colour) < 45 or min(colour) > 235:
            continue
        if all(sum(abs(colour[i] - old[i]) for i in range(3)) > 70 for old in chosen):
            chosen.append(colour)
        if len(chosen) == 4:
            break
    defaults = [(151, 168, 227), (82, 52, 145), (187, 205, 245), (105, 93, 175)]
    chosen.extend(defaults[len(chosen):])
    return ["#%02x%02x%02x" % c for c in chosen[:4]]


class PublisherApi:
    def __init__(self, key):
        self.key = key

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.key}"}

    def library(self):
        response = requests.get(f"{API_ROOT}/admin/library", headers=self.headers, timeout=25)
        response.raise_for_status()
        return response.json()

    def get_band(self, slug):
        response = requests.get(f"{API_ROOT}/admin/bands/{slug}", headers=self.headers, timeout=25)
        response.raise_for_status()
        return response.json()

    def upload(self, slug, kind, path):
        content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
        with open(path, "rb") as stream:
            response = requests.put(
                f"{API_ROOT}/admin/bands/{slug}/media/{kind}",
                headers={**self.headers, "Content-Type": content_type, "X-File-Name": Path(path).name},
                data=stream,
                timeout=180,
            )
        response.raise_for_status()
        return response.json()

    def save_band(self, slug, data):
        response = requests.put(f"{API_ROOT}/admin/bands/{slug}", headers={**self.headers, "Content-Type": "application/json"}, json=data, timeout=30)
        response.raise_for_status()
        return response.json()


class CrowdSurfPublisher(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME)
        self.geometry("1220x790")
        self.minsize(1080, 700)
        self.configure(bg="#0b0710")
        self.current_slug = None
        self.current_record = None
        self.artwork_path = tk.StringVar()
        self.mp3_path = tk.StringVar()
        self.title_var = tk.StringVar()
        self.published_var = tk.BooleanVar(value=True)
        self.status_var = tk.StringVar(value="Ready")
        self.public_url_var = tk.StringVar()
        self.qr_photo = None
        self.links = []
        self.api = PublisherApi(self.load_or_request_key())
        self.configure_styles()
        self.build_ui()
        self.after(150, self.refresh_library)

    def load_or_request_key(self):
        key = ""
        try:
            key = json.loads(CONFIG_FILE.read_text(encoding="utf-8")).get("publisher_key", "")
        except Exception:
            pass
        if not key:
            key = simpledialog.askstring("Publisher setup", "Paste your Crowd Surf publisher key. You only need to do this once:", show="•", parent=self) or ""
            match = re.search(r"\b[0-9a-fA-F]{64}\b", key)
            if match:
                key = match.group(0)
            if key:
                CONFIG_DIR.mkdir(parents=True, exist_ok=True)
                CONFIG_FILE.write_text(json.dumps({"publisher_key": key}), encoding="utf-8")
        return key.strip()

    def configure_styles(self):
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("Treeview", background="#17111e", foreground="#ffffff", fieldbackground="#17111e", rowheight=34, borderwidth=0)
        style.configure("Treeview.Heading", background="#251a30", foreground="#f6f23d", font=("Segoe UI", 10, "bold"))
        style.map("Treeview", background=[("selected", "#5c246f")])
        style.configure("TCombobox", fieldbackground="#1a1321", background="#1a1321", foreground="#ffffff")

    def build_ui(self):
        header = tk.Frame(self, bg="#0b0710", height=74)
        header.pack(fill="x", padx=24, pady=(18, 8))
        tk.Label(header, text="CROWD SURF", bg="#0b0710", fg="#f6f23d", font=("Arial Black", 27)).pack(side="left")
        tk.Label(header, text="  PUBLISHER", bg="#0b0710", fg="#ffffff", font=("Segoe UI", 21, "bold")).pack(side="left", pady=(6, 0))
        tk.Button(header, text="NEW", command=self.new_record, bg="#342441", fg="#ffffff", activebackground="#50365f", relief="flat", padx=22, pady=10, font=("Segoe UI", 10, "bold")).pack(side="right")

        body = tk.PanedWindow(self, orient="horizontal", bg="#0b0710", sashwidth=7, bd=0)
        body.pack(fill="both", expand=True, padx=24, pady=(0, 14))
        left = tk.Frame(body, bg="#120d18", padx=14, pady=14)
        right = tk.Frame(body, bg="#120d18", padx=22, pady=16)
        body.add(left, minsize=285, width=330)
        body.add(right, minsize=700)

        tk.Label(left, text="LIBRARY", bg="#120d18", fg="#ffffff", font=("Segoe UI", 12, "bold")).pack(anchor="w", pady=(0, 10))
        self.tree = ttk.Treeview(left, columns=("status",), show="tree headings", selectmode="browse")
        self.tree.heading("#0", text="TITLE")
        self.tree.heading("status", text="STATUS")
        self.tree.column("#0", width=190, stretch=True)
        self.tree.column("status", width=78, anchor="center", stretch=False)
        self.tree.pack(fill="both", expand=True)
        self.tree.bind("<<TreeviewSelect>>", self.on_library_select)
        tk.Button(left, text="REFRESH LIBRARY", command=self.refresh_library, bg="#251a30", fg="#ffffff", relief="flat", pady=9).pack(fill="x", pady=(10, 0))

        form = tk.Frame(right, bg="#120d18")
        form.pack(fill="both", expand=True)
        self.field(form, "TITLE", self.title_var, 0)
        self.file_field(form, "MP3", self.mp3_path, self.pick_mp3, 1)
        self.file_field(form, "IMAGE", self.artwork_path, self.pick_artwork, 2)

        tk.Label(form, text="CALL TO ACTION LINKS · UP TO 4", bg="#120d18", fg="#aaa2b0", font=("Segoe UI", 9, "bold")).grid(row=3, column=0, columnspan=4, sticky="w", pady=(17, 7))
        for i in range(4):
            kind = tk.StringVar(value=CTA_TYPES[i] if i < 2 else "Other")
            label = tk.StringVar(value="")
            url = tk.StringVar(value="")
            self.links.append((kind, label, url))
            combo = ttk.Combobox(form, textvariable=kind, values=CTA_TYPES, width=13, state="readonly")
            combo.grid(row=4+i, column=0, sticky="ew", padx=(0, 8), pady=4)
            tk.Entry(form, textvariable=label, bg="#1a1321", fg="#ffffff", insertbackground="#ffffff", relief="flat", font=("Segoe UI", 10)).grid(row=4+i, column=1, sticky="ew", padx=(0, 8), pady=4, ipady=9)
            tk.Entry(form, textvariable=url, bg="#1a1321", fg="#ffffff", insertbackground="#ffffff", relief="flat", font=("Segoe UI", 10)).grid(row=4+i, column=2, columnspan=2, sticky="ew", pady=4, ipady=9)

        action_row = tk.Frame(form, bg="#120d18")
        action_row.grid(row=8, column=0, columnspan=4, sticky="ew", pady=(17, 8))
        tk.Checkbutton(action_row, text="PUBLISHED", variable=self.published_var, bg="#120d18", fg="#ffffff", selectcolor="#291b34", activebackground="#120d18", activeforeground="#ffffff", font=("Segoe UI", 11, "bold")).pack(side="left")
        self.save_button = tk.Button(action_row, text="SAVE + PUBLISH", command=self.save_clicked, bg="#f6f23d", fg="#110a16", activebackground="#ffffff", relief="flat", padx=25, pady=12, font=("Segoe UI", 11, "bold"))
        self.save_button.pack(side="right")

        output = tk.Frame(form, bg="#0b0710", padx=15, pady=13)
        output.grid(row=9, column=0, columnspan=4, sticky="nsew", pady=(9, 0))
        tk.Label(output, text="PUBLIC LINK", bg="#0b0710", fg="#aaa2b0", font=("Segoe UI", 9, "bold")).grid(row=0, column=0, sticky="w")
        self.url_entry = tk.Entry(output, textvariable=self.public_url_var, bg="#17111e", fg="#ffffff", relief="flat", state="readonly", readonlybackground="#17111e", font=("Segoe UI", 10))
        self.url_entry.grid(row=1, column=0, sticky="ew", pady=(5, 9), ipady=8)
        tk.Button(output, text="COPY", command=self.copy_link, bg="#342441", fg="#ffffff", relief="flat", padx=14).grid(row=1, column=1, padx=(8, 0), pady=(5, 9), sticky="ns")
        tk.Button(output, text="OPEN", command=self.open_link, bg="#342441", fg="#ffffff", relief="flat", padx=14).grid(row=1, column=2, padx=(8, 0), pady=(5, 9), sticky="ns")
        self.qr_label = tk.Label(output, bg="#0b0710", text="QR appears after saving", fg="#7f7686", width=20, height=8)
        self.qr_label.grid(row=2, column=0, sticky="w")
        tk.Button(output, text="SAVE QR CODE", command=self.save_qr_copy, bg="#251a30", fg="#ffffff", relief="flat", padx=16, pady=9).grid(row=2, column=1, columnspan=2, sticky="s", padx=(8, 0))
        output.columnconfigure(0, weight=1)
        form.columnconfigure(0, weight=0)
        form.columnconfigure(1, weight=1)
        form.columnconfigure(2, weight=3)
        form.columnconfigure(3, weight=0)
        form.rowconfigure(9, weight=1)

        footer = tk.Label(self, textvariable=self.status_var, bg="#060409", fg="#bdb5c3", anchor="w", padx=24, pady=8, font=("Segoe UI", 9))
        footer.pack(fill="x")

    def field(self, parent, label, variable, row):
        tk.Label(parent, text=label, bg="#120d18", fg="#aaa2b0", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky="w", pady=5)
        tk.Entry(parent, textvariable=variable, bg="#1a1321", fg="#ffffff", insertbackground="#ffffff", relief="flat", font=("Segoe UI", 11)).grid(row=row, column=1, columnspan=3, sticky="ew", padx=(10, 0), pady=5, ipady=10)

    def file_field(self, parent, label, variable, command, row):
        tk.Label(parent, text=label, bg="#120d18", fg="#aaa2b0", font=("Segoe UI", 9, "bold")).grid(row=row, column=0, sticky="w", pady=5)
        tk.Entry(parent, textvariable=variable, bg="#1a1321", fg="#ffffff", insertbackground="#ffffff", relief="flat", font=("Segoe UI", 10)).grid(row=row, column=1, columnspan=2, sticky="ew", padx=(10, 8), pady=5, ipady=10)
        tk.Button(parent, text="CHOOSE", command=command, bg="#342441", fg="#ffffff", relief="flat", padx=14, pady=9).grid(row=row, column=3, sticky="ew", pady=5)

    def pick_mp3(self):
        path = filedialog.askopenfilename(title="Choose MP3", filetypes=[("MP3 audio", "*.mp3"), ("Audio files", "*.mp3 *.m4a *.wav"), ("All files", "*.*")])
        if path:
            self.mp3_path.set(path)

    def pick_artwork(self):
        path = filedialog.askopenfilename(title="Choose band artwork", filetypes=[("Images", "*.jpg *.jpeg *.png *.webp"), ("All files", "*.*")])
        if path:
            self.artwork_path.set(path)

    def new_record(self):
        self.current_slug = None
        self.current_record = None
        self.title_var.set("")
        self.mp3_path.set("")
        self.artwork_path.set("")
        self.published_var.set(True)
        self.public_url_var.set("")
        for kind, label, url in self.links:
            kind.set("Other")
            label.set("")
            url.set("")
        self.qr_label.configure(image="", text="QR appears after saving")
        self.status_var.set("New edition")

    def refresh_library(self):
        self.run_task("Loading library…", self._refresh_library)

    def _refresh_library(self):
        records = self.api.library()
        self.after(0, lambda: self.populate_library(records))

    def populate_library(self, records):
        self.tree.delete(*self.tree.get_children())
        for item in records:
            self.tree.insert("", "end", iid=item["slug"], text=item.get("title", "Untitled"), values=("LIVE" if item.get("published") else "OFF",))
        self.status_var.set(f"{len(records)} edition{'s' if len(records) != 1 else ''} in library")

    def on_library_select(self, _event=None):
        selection = self.tree.selection()
        if selection:
            self.run_task("Opening edition…", lambda: self._load_record(selection[0]))

    def _load_record(self, slug):
        record = self.api.get_band(slug)
        self.after(0, lambda: self.show_record(record))

    def show_record(self, record):
        self.current_slug = record["slug"]
        self.current_record = record
        self.title_var.set(record.get("title", ""))
        self.mp3_path.set("Already uploaded — choose a file only to replace it")
        self.artwork_path.set("Already uploaded — choose a file only to replace it")
        self.published_var.set(bool(record.get("published")))
        self.public_url_var.set(record.get("publicUrl", ""))
        links = record.get("links", [])
        for i, (kind, label, url) in enumerate(self.links):
            link = links[i] if i < len(links) else {}
            display_kind = str(link.get("icon", "Other")).title()
            kind.set(display_kind if display_kind in CTA_TYPES else "Other")
            label.set(link.get("label", ""))
            url.set(link.get("url", ""))
        self.show_qr(record.get("publicUrl", ""))
        self.status_var.set(f"Editing {record.get('title', '')}")

    def collect_links(self):
        result = []
        for kind, label, url in self.links:
            address = url.get().strip()
            if not address:
                continue
            if not valid_url(address):
                raise ValueError(f"Link must start with http:// or https://: {address}")
            result.append({"icon": kind.get().lower(), "label": (label.get().strip() or kind.get()).upper(), "url": address})
        return result

    def save_clicked(self):
        self.run_task("Publishing edition…", self._save_record)

    def _save_record(self):
        title = self.title_var.get().strip()
        if not title:
            raise ValueError("Please enter the band title.")
        slug = self.current_slug or slugify(title)
        art_path = self.artwork_path.get().strip()
        audio_path = self.mp3_path.get().strip()
        new_art = Path(art_path).is_file()
        new_audio = Path(audio_path).is_file()
        if not self.current_record and not new_art:
            raise ValueError("Please choose an artwork image.")
        if not self.current_record and not new_audio:
            raise ValueError("Please choose an MP3.")
        links = self.collect_links()
        public_url = f"{API_ROOT}/g/{slug}"
        palette = extract_palette(art_path) if new_art else (self.current_record or {}).get("palette", [])

        with tempfile.TemporaryDirectory(prefix="crowd-surf-") as temp_dir:
            temp = Path(temp_dir)
            preview_path = temp / "preview.jpg"
            qr_path = temp / "qr.png"
            qrcode.make(public_url).save(qr_path)
            if new_art:
                make_preview(art_path, title, preview_path)
                self.api.upload(slug, "artwork", art_path)
                self.api.upload(slug, "preview", preview_path)
            if new_audio:
                self.api.upload(slug, "audio", audio_path)
            self.api.upload(slug, "qr", qr_path)

        record = self.api.save_band(slug, {"title": title, "published": self.published_var.get(), "links": links, "palette": palette})
        self.after(0, lambda: self.saved(record))

    def saved(self, record):
        self.show_record(record)
        self.status_var.set("Published successfully" if record.get("published") else "Saved as unpublished")
        messagebox.showinfo("Crowd Surf", "The public edition is live." if record.get("published") else "The edition is saved and currently unpublished.", parent=self)
        self.refresh_library()

    def show_qr(self, url):
        if not url:
            return
        image = qrcode.make(url).convert("RGB").resize((142, 142), Image.Resampling.NEAREST)
        self.qr_photo = ImageTk.PhotoImage(image)
        self.qr_label.configure(image=self.qr_photo, text="", width=142, height=142)

    def save_qr_copy(self):
        url = self.public_url_var.get().strip()
        if not url:
            messagebox.showinfo("QR code", "Save the edition first.", parent=self)
            return
        path = filedialog.asksaveasfilename(title="Save QR code", defaultextension=".png", filetypes=[("PNG image", "*.png")], initialfile=f"{self.current_slug or 'crowd-surf'}-qr.png")
        if path:
            qrcode.make(url).save(path)
            self.status_var.set(f"QR code saved: {path}")

    def copy_link(self):
        url = self.public_url_var.get().strip()
        if url:
            self.clipboard_clear()
            self.clipboard_append(url)
            self.status_var.set("Public link copied")

    def open_link(self):
        url = self.public_url_var.get().strip()
        if url:
            webbrowser.open_new_tab(url)

    def run_task(self, status, function):
        self.status_var.set(status)
        self.save_button.configure(state="disabled")

        def worker():
            try:
                function()
            except requests.HTTPError as exc:
                detail = exc.response.text[:500] if exc.response is not None else str(exc)
                self.after(0, lambda: messagebox.showerror("Crowd Surf Publisher", f"The publishing service returned an error.\n\n{detail}", parent=self))
                self.after(0, lambda: self.status_var.set("Publishing error"))
            except Exception as exc:
                self.after(0, lambda: messagebox.showerror("Crowd Surf Publisher", str(exc), parent=self))
                self.after(0, lambda: self.status_var.set("Action could not be completed"))
            finally:
                self.after(0, lambda: self.save_button.configure(state="normal"))

        threading.Thread(target=worker, daemon=True).start()


if __name__ == "__main__":
    CrowdSurfPublisher().mainloop()
