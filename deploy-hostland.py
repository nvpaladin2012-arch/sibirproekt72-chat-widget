import ftplib, hashlib, os, sys, io, json
from pathlib import Path

ENV_PATH = Path(r"C:\Users\Роман\OneDrive\Desktop\Для работы.env")
WS = Path(r"C:\Users\Роман\OneDrive\Desktop\opencode\sitenew")
REMOTE_ROOT = "/htdocs/www"
HOST = "sibirproekt72.ru"

def load_ftp_password():
    lines = ENV_PATH.read_text(encoding="utf-8", errors="ignore").splitlines()
    # known structure: password is the line after "Установка пароля FTP пользователя host1891953"
    for i, line in enumerate(lines):
        if "Установка пароля FTP пользователя host1891953" in line:
            for j in range(i+1, len(lines)):
                v = lines[j].strip()
                if v:
                    return v
    # fallback: line 26 (1-based in file shown) -> index 25
    if len(lines) > 25 and lines[25].strip():
        return lines[25].strip()
    raise RuntimeError("FTP password not found")

def ensure_dir(ftp, path):
    parts = [p for p in path.split("/") if p]
    cur = ""
    for p in parts:
        cur += "/" + p
        try:
            ftp.cwd(cur)
        except Exception:
            try:
                ftp.mkd(cur)
            except Exception:
                pass
            ftp.cwd(cur)

def upload_file(ftp, local: Path, remote_path: str, backup_dir: Path):
    remote_dir = os.path.dirname(remote_path).replace("\\", "/")
    name = os.path.basename(remote_path)
    ensure_dir(ftp, remote_dir)
    # backup existing
    try:
        buf = io.BytesIO()
        ftp.retrbinary("RETR " + name, buf.write)
        backup_dir.mkdir(parents=True, exist_ok=True)
        rel_backup = remote_path.lstrip("/").replace("/", "__")
        (backup_dir / rel_backup).write_bytes(buf.getvalue())
    except Exception:
        pass
    with local.open("rb") as fh:
        ftp.storbinary("STOR " + name, fh)
    # verify
    buf = io.BytesIO()
    ftp.retrbinary("RETR " + name, buf.write)
    remote_hash = hashlib.sha256(buf.getvalue()).hexdigest()
    local_hash = hashlib.sha256(local.read_bytes()).hexdigest()
    return remote_hash == local_hash

def main():
    password = load_ftp_password()
    user = "host1891953"

    files = [
        WS / "api" / ".htaccess",
        WS / "api" / "live.php",
        WS / "api" / "live-auth.php",
        WS / "api" / "live-data" / ".htaccess",
        WS / "js" / "chat-widget.js",
        WS / "js" / "operator.js",
        WS / "css" / "operator.css",
        WS / "operator.html",
    ]
    # all html pages where widget version bumped
    for p in sorted(WS.rglob("*.html")):
        try:
            t = p.read_text(encoding="utf-8")
        except Exception:
            continue
        if "chat-widget.js?v=20261124-1" in t and p not in files:
            files.append(p)

    backup_dir = Path(r"C:\Users\Роман\AppData\Local\Temp\opencode\live-chat-backup-20261124")
    results = []
    bad = []
    with ftplib.FTP(HOST, timeout=120) as ftp:
        ftp.login(user, password)
        ftp.set_pasv(True)
        for local in files:
            rel = local.relative_to(WS).as_posix()
            remote_path = REMOTE_ROOT + "/" + rel
            ok = upload_file(ftp, local, remote_path, backup_dir)
            results.append((rel, ok))
            if not ok:
                bad.append(rel)
    print("UPLOADED", len(results))
    print("MISMATCH", len(bad))
    for rel, ok in results:
        print(("OK" if ok else "BAD"), rel)
    if bad:
        sys.exit(2)

if __name__ == "__main__":
    main()
