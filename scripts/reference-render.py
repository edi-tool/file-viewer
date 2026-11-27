"""Development-only reference render. Never pass untrusted/user files to this script.
Requires Pillow, PyMuPDF, Ghostscript; uses only the generator's synthetic fixtures.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import io
import subprocess
from PIL import Image
import fitz

ROOT = Path(__file__).resolve().parent.parent
def verify(name, im):
    im = im.convert("RGB")
    assert im.size == (64, 64), (name, im.size)
    assert im.getpixel((16,32)) == (255,0,0), name
    assert im.getpixel((48,32)) == (0,0,255), name
    print(name, "PASS", im.size)

with TemporaryDirectory() as tmp:
    p = Path(tmp)
    subprocess.run(["node", str(ROOT/"scripts/fixtures.mjs"), str(p)], check=True, timeout=15)
    for name in ["composite.psd", "rgb.tiff"]:
        with Image.open(p/name) as im:
            verify(name, im)
    for name in ["two-colors.pdf", "pdf-compatible-candidate.ai"]:
        with fitz.open(stream=(p/name).read_bytes(), filetype="pdf") as doc:
            assert len(doc) == 1
            pix = doc[0].get_pixmap()
            verify(name, Image.frombytes("RGB", (pix.width,pix.height), pix.samples))
    for name in ["vector.eps", "binary-preview.eps"]:
        source = p/name
        if name == "binary-preview.eps":
            data = source.read_bytes()
            offset, length = int.from_bytes(data[4:8],"little"), int.from_bytes(data[8:12],"little")
            ti, tl = int.from_bytes(data[20:24],"little"), int.from_bytes(data[24:28],"little")
            with Image.open(io.BytesIO(data[ti:ti+tl])) as im:
                verify("EPS TIFF preview", im)
            source = p/"extracted.ps"
            source.write_bytes(data[offset:offset+length])
        out = p/(name+".png")
        subprocess.run(["gs","-q","-dSAFER","-dBATCH","-dNOPAUSE","-dEPSCrop","-sDEVICE=png16m","-r72",f"-sOutputFile={out}",str(source)],check=True,timeout=15)
        with Image.open(out) as im:
            verify(name, im)
