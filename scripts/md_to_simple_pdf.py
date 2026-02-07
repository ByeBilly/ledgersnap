import sys
from pathlib import Path

PAGE_WIDTH = 612  # Letter
PAGE_HEIGHT = 792
MARGIN = 72
FONT_SIZE = 11
LINE_HEIGHT = 14
MAX_CHARS = 90


def wrap_line(line: str, max_chars: int) -> list[str]:
    if len(line) <= max_chars:
        return [line]
    words = line.split(' ')
    lines = []
    current = ""
    for word in words:
        if not current:
            current = word
        elif len(current) + 1 + len(word) <= max_chars:
            current += " " + word
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_pdf(lines: list[str], output_path: Path):
    usable_height = PAGE_HEIGHT - 2 * MARGIN
    lines_per_page = int(usable_height // LINE_HEIGHT)
    pages = [lines[i:i + lines_per_page] for i in range(0, len(lines), lines_per_page)]

    objects = []
    xref_positions = []
    offset = 0

    def add_object(obj_str: str):
        nonlocal offset
        xref_positions.append(offset)
        objects.append(obj_str)
        offset += len(obj_str.encode("latin1"))

    # PDF header
    header = "%PDF-1.4\n"
    offset += len(header.encode("latin1"))

    # Font object (5)
    add_object("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

    # Page and content objects
    page_objects = []
    content_objects = []
    obj_index = 6

    for page_lines in pages:
        content_stream = ["BT", f"/F1 {FONT_SIZE} Tf", f"{MARGIN} {PAGE_HEIGHT - MARGIN} Td"]
        for line in page_lines:
            content_stream.append(f"({escape_pdf_text(line)}) Tj")
            content_stream.append(f"0 {-LINE_HEIGHT} Td")
        content_stream.append("ET")
        content_data = "\n".join(content_stream)
        content_obj = f"{obj_index} 0 obj\n<< /Length {len(content_data.encode('latin1'))} >>\nstream\n{content_data}\nendstream\nendobj\n"
        content_objects.append(obj_index)
        add_object(content_obj)
        obj_index += 1

        page_obj = (
            f"{obj_index} 0 obj\n"
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 5 0 R >> >> /Contents {content_objects[-1]} 0 R >>\n"
            f"endobj\n"
        )
        page_objects.append(obj_index)
        add_object(page_obj)
        obj_index += 1

    # Pages object (2)
    kids = " ".join(f"{pid} 0 R" for pid in page_objects)
    add_object(f"2 0 obj\n<< /Type /Pages /Count {len(page_objects)} /Kids [{kids}] >>\nendobj\n")

    # Catalog object (1)
    add_object("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

    # Build xref
    xref_offset = offset
    xref = ["xref", f"0 {len(objects) + 1}", "0000000000 65535 f "]
    for pos in xref_positions:
        xref.append(f"{pos:010d} 00000 n ")
    xref_data = "\n".join(xref) + "\n"

    trailer = (
        "trailer\n"
        f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        "startxref\n"
        f"{xref_offset}\n"
        "%%EOF\n"
    )

    with output_path.open("wb") as f:
        f.write(header.encode("latin1"))
        for obj in objects:
            f.write(obj.encode("latin1"))
        f.write(xref_data.encode("latin1"))
        f.write(trailer.encode("latin1"))


def main():
    if len(sys.argv) != 3:
        print("Usage: md_to_simple_pdf.py <input.md> <output.pdf>")
        sys.exit(1)
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    raw_lines = input_path.read_text(encoding="utf-8").splitlines()
    lines = []
    for line in raw_lines:
        if not line.strip():
            lines.append("")
            continue
        for wrapped in wrap_line(line, MAX_CHARS):
            lines.append(wrapped)
    build_pdf(lines, output_path)
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
