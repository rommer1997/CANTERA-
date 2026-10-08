#!/usr/bin/env python3
"""Typeset the versioned Markdown whitepaper with the Cantera visual identity.

Run with the bundled Python runtime. Pass --expected-sha256 to freeze a final
source version, then --publish to make an identical public download copy.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies'
FONT_ROOT = RUNTIME / 'native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype'
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 48
CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
INK = colors.HexColor('#171719')
FOREST = colors.HexColor('#cf302b')
DEEP = colors.HexColor('#171719')
LIME = colors.HexColor('#ff7770')
MUTED = colors.HexColor('#696970')
LINE = colors.HexColor('#e4e4e7')
PALE = colors.HexColor('#f5f5f6')
WHITE = colors.white


def register_fonts() -> None:
    fonts = {
        'CanteraBody': 'DejaVuSans.ttf',
        'CanteraBodyBold': 'DejaVuSans-Bold.ttf',
        'CanteraBodyItalic': 'DejaVuSans-Oblique.ttf',
        'CanteraTitle': 'Rubik-Regular.ttf',
        'CanteraTitleBold': 'Rubik-Bold.ttf',
        'CanteraMono': 'DejaVuSansMono.ttf',
    }
    for name, filename in fonts.items():
        pdfmetrics.registerFont(TTFont(name, str(FONT_ROOT / filename)))
    pdfmetrics.registerFontFamily(
        'CanteraBody', normal='CanteraBody', bold='CanteraBodyBold',
        italic='CanteraBodyItalic', boldItalic='CanteraBodyBold',
    )
    pdfmetrics.registerFontFamily(
        'CanteraTitle', normal='CanteraTitle', bold='CanteraTitleBold',
        italic='CanteraTitle', boldItalic='CanteraTitleBold',
    )


def normalise(value: str) -> str:
    return (value.replace('\u2011', '-').replace('\u2010', '-').replace('\u2013', '-')
            .replace('\u2014', '-').replace('\u2212', '-').replace('\u00a0', ' ')
            .replace('\u202f', ' '))


class MarkdownRenderer:
    tokens = re.compile(r'(\[[^\]]+\]\([^\)]+\)|`[^`]+`|\*\*.+?\*\*)')
    links = re.compile(r'^\[([^\]]+)\]\(([^\)]+)\)$')

    def __init__(self) -> None:
        self.external_links: dict[str, str] = {}
        self.local_references: dict[str, str] = {}

    def inline(self, text: str, *, table: bool = False) -> str:
        result: list[str] = []
        for piece in self.tokens.split(normalise(text)):
            link = self.links.match(piece)
            if link:
                label, url = link.groups()
                if url.startswith(('https://', 'http://')):
                    self.external_links[url] = label
                    result.append(f'<a href="{html.escape(url, quote=True)}" color="#cf302b"><u>{self.inline(label, table=table)}</u></a>')
                else:
                    self.local_references[url] = label
                    result.append(f'<font color="#cf302b">{self.inline(label, table=table)}</font>')
            elif piece.startswith('**') and piece.endswith('**'):
                result.append(f'<b>{self.inline(piece[2:-2], table=table)}</b>')
            elif piece.startswith('`') and piece.endswith('`'):
                size = '7.3' if table else '8.0'
                result.append(f'<font name="CanteraMono" size="{size}" color="#47634f">{html.escape(piece[1:-1])}</font>')
            else:
                result.append(html.escape(piece))
        return ''.join(result)


def styles() -> dict[str, ParagraphStyle]:
    body = ParagraphStyle(
        'Body', fontName='CanteraBody', fontSize=9.5, leading=15.1,
        textColor=INK, alignment=TA_LEFT, spaceAfter=11, splitLongWords=True,
        allowWidows=0, allowOrphans=0,
    )
    return {
        'body': body,
        'meta': ParagraphStyle('Meta', parent=body, fontSize=8.5, leading=13.3, spaceAfter=8),
        'h2': ParagraphStyle('Section', parent=body, fontName='CanteraTitleBold', fontSize=19,
                             leading=24, spaceBefore=22, spaceAfter=13, keepWithNext=True),
        'h3': ParagraphStyle('Subsection', parent=body, fontName='CanteraTitleBold', fontSize=12.2,
                             leading=17, spaceBefore=13, spaceAfter=8, keepWithNext=True),
        'list': ParagraphStyle('List', parent=body, leftIndent=17, firstLineIndent=0,
                               bulletIndent=0, spaceAfter=6),
        'table': ParagraphStyle('TableCell', parent=body, fontSize=8.1, leading=12.1,
                                spaceAfter=0, allowWidows=1, allowOrphans=1),
        'table_header': ParagraphStyle('TableHeader', parent=body, fontName='CanteraTitleBold',
                                       fontSize=8.1, leading=11.5, textColor=WHITE, spaceAfter=0),
        'toc': ParagraphStyle('Contents', parent=body, fontName='CanteraTitle', fontSize=10.1,
                              leading=14.5, spaceBefore=1.8, spaceAfter=0, textColor=INK),
        'note': ParagraphStyle('Note', parent=body, fontSize=8.5, leading=13.5, textColor=MUTED),
        'eyebrow': ParagraphStyle('Eyebrow', parent=body, fontName='CanteraTitleBold', fontSize=8,
                                  leading=12, textColor=FOREST, spaceAfter=10),
        'index_title': ParagraphStyle('IndexTitle', parent=body, fontName='CanteraTitleBold',
                                     fontSize=30, leading=36, spaceAfter=17),
    }


class Cover(Flowable):
    def __init__(self, version: str, date: str, status: str) -> None:
        super().__init__()
        self.width, self.height = PAGE_WIDTH, PAGE_HEIGHT
        self.version, self.date = version, date
        self.status = normalise(status[:1].upper() + status[1:])

    def wrap(self, available_width: float, available_height: float) -> tuple[float, float]:
        return self.width, self.height

    def draw(self) -> None:
        c = self.canv
        c.setFillColor(DEEP)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
        c.saveState()
        c.translate(PAGE_WIDTH - 245, 325)
        c.rotate(-14)
        c.setStrokeColor(colors.HexColor('#55555d'))
        c.setLineWidth(1)
        c.rect(-70, -96, 370, 225, stroke=1, fill=0)
        c.line(115, -96, 115, 129)
        c.circle(115, 16, 36, stroke=1, fill=0)
        c.rect(-70, -40, 42, 111, stroke=1, fill=0)
        c.rect(258, -40, 42, 111, stroke=1, fill=0)
        for x, y, color in [(20, 69, LIME), (97, -45, LIME), (150, 56, WHITE), (215, -28, WHITE)]:
            c.setFillColor(color)
            c.circle(x, y, 5, stroke=0, fill=1)
        c.restoreState()

        c.setFillColor(WHITE)
        c.setFont('CanteraTitleBold', 42)
        c.drawString(MARGIN, PAGE_HEIGHT - 87, 'LaCantera')
        brand_width = pdfmetrics.stringWidth('LaCantera', 'CanteraTitleBold', 42)
        c.setFillColor(LIME)
        c.rect(MARGIN + brand_width + 3, PAGE_HEIGHT - 87, 7, 7, stroke=0, fill=1)
        c.setFillColor(colors.HexColor('#ccccd2'))
        c.setFont('CanteraTitleBold', 8.3)
        c.drawString(MARGIN, PAGE_HEIGHT - 137, 'DOCUMENTO DE PROYECTO')
        c.setFillColor(WHITE)
        c.setFont('CanteraTitleBold', 46)
        c.drawString(MARGIN, PAGE_HEIGHT - 236, 'Whitepaper')
        c.drawString(MARGIN, PAGE_HEIGHT - 289, 'del proyecto')
        c.setFont('CanteraTitle', 23)
        c.setFillColor(LIME)
        c.drawString(MARGIN, PAGE_HEIGHT - 358, 'Del barrio al mundo.')
        description_style = ParagraphStyle('CoverDescription', fontName='CanteraBody', fontSize=12,
                                           leading=19, textColor=colors.HexColor('#e6e6ea'))
        p = Paragraph('Misión, producto, gobernanza, sostenibilidad y trazabilidad de una comunidad deportiva global de acceso gratuito.', description_style)
        _, height = p.wrap(430, 100)
        p.drawOn(c, MARGIN, PAGE_HEIGHT - 392 - height)

        c.setFillColor(colors.HexColor('#d7d7de'))
        c.setFont('CanteraTitleBold', 7.8)
        c.drawString(MARGIN, 314, 'ACCESO GRATUITO   /   ALCANCE GLOBAL PREVISTO')
        c.setFillColor(PALE)
        c.roundRect(MARGIN, 103, CONTENT_WIDTH, 157, 9, stroke=0, fill=1)
        c.setFillColor(FOREST)
        c.setFont('CanteraTitleBold', 8.2)
        c.drawString(MARGIN + 18, 233, 'ESTADO DE ESTA EDICIÓN')
        status_style = ParagraphStyle('CoverStatus', fontName='CanteraBody', fontSize=9.1,
                                      leading=14.4, textColor=INK)
        status = Paragraph(html.escape(self.status), status_style)
        _, status_height = status.wrap(CONTENT_WIDTH - 36, 112)
        if status_height > 106:
            raise ValueError('La situación documental excede el espacio de portada.')
        status.drawOn(c, MARGIN + 18, 216 - status_height)
        c.setFillColor(colors.HexColor('#c3c3cc'))
        c.setFont('CanteraTitle', 8.1)
        c.drawString(MARGIN, 55, f'VERSIÓN {self.version}  |  {self.date.upper()}')
        c.drawRightString(PAGE_WIDTH - MARGIN, 55, 'LaCantera / WHITEPAPER')


class SectionHeading(Paragraph):
    def __init__(self, text: str, style: ParagraphStyle, anchor: str, raw_title: str) -> None:
        super().__init__(text, style)
        self.anchor = anchor
        self.raw_title = raw_title


class WhitepaperDocument(BaseDocTemplate):
    def __init__(self, filename: str, version: str, **kwargs: object) -> None:
        super().__init__(filename, **kwargs)
        self.version = version
        self.heading_pages: dict[str, int] = {}
        self.table_pages: list[int] = []
        self.addPageTemplates([
            PageTemplate('Cover', [Frame(0, 0, PAGE_WIDTH, PAGE_HEIGHT, leftPadding=0,
                                         rightPadding=0, topPadding=0, bottomPadding=0)]),
            PageTemplate('Body', [Frame(MARGIN, 55, CONTENT_WIDTH, PAGE_HEIGHT - 112,
                                        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
                         onPage=self.header),
        ])

    def header(self, c: canvas.Canvas, doc: BaseDocTemplate) -> None:
        c.saveState()
        c.setFillColor(FOREST)
        c.setFont('CanteraTitleBold', 10)
        c.drawString(MARGIN, PAGE_HEIGHT - 31, 'LaCantera')
        c.setFillColor(MUTED)
        c.setFont('CanteraBody', 7.3)
        c.drawRightString(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 30, f'WHITEPAPER DEL PROYECTO / V{self.version}')
        c.setStrokeColor(LINE)
        c.setLineWidth(.6)
        c.line(MARGIN, PAGE_HEIGHT - 42, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 42)
        c.restoreState()

    def afterFlowable(self, flowable: Flowable) -> None:
        if isinstance(flowable, SectionHeading):
            self.canv.bookmarkPage(flowable.anchor)
            self.canv.addOutlineEntry(flowable.raw_title, flowable.anchor, 0, False)
            self.notify('TOCEntry', (0, flowable.getPlainText(), self.page, flowable.anchor))
            self.heading_pages[flowable.raw_title] = self.page
        if isinstance(flowable, Table):
            self.table_pages.append(self.page)

    def beforeDocument(self) -> None:
        self.heading_pages = {}
        self.table_pages = []


class NumberedCanvas(canvas.Canvas):
    def showPage(self) -> None:
        # Emit each page immediately so TOC destinations point to their real page.
        if self._pageNumber > 1:
            self.saveState()
            self.setStrokeColor(LINE)
            self.setLineWidth(.6)
            self.line(MARGIN, 43, PAGE_WIDTH - MARGIN, 43)
            self.setFillColor(MUTED)
            self.setFont('CanteraBody', 7)
            self.drawString(MARGIN, 27, 'Documento de proyecto - lanzamiento pendiente')
            self.setFillColor(FOREST)
            self.setFont('CanteraTitleBold', 7.8)
            self.drawRightString(PAGE_WIDTH - MARGIN, 27, str(self._pageNumber))
            self.restoreState()
        super().showPage()


def make_table(rows: list[list[str]], renderer: MarkdownRenderer, style: dict[str, ParagraphStyle]) -> Table:
    count = len(rows[0])
    if any(len(row) != count for row in rows):
        raise ValueError('Tabla Markdown con distinto número de columnas.')
    first = rows[0][0]
    if count == 4 and first == 'ID':
        widths = [39, 134, 148, CONTENT_WIDTH - 321]
    elif count == 4:
        widths = [82, 114, 135, CONTENT_WIDTH - 331]
    elif count == 3 and first == 'Versión':
        widths = [58, 112, CONTENT_WIDTH - 170]
    elif count == 3 and first == 'Control':
        widths = [87, 220, CONTENT_WIDTH - 307]
    elif count == 3 and first == 'Usuario':
        widths = [125, 178, CONTENT_WIDTH - 303]
    elif count == 3:
        widths = [111, 191, CONTENT_WIDTH - 302]
    else:
        widths = [CONTENT_WIDTH / count] * count
    cells = [[Paragraph(renderer.inline(cell, table=True), style['table_header' if row_index == 0 else 'table'])
              for cell in row] for row_index, row in enumerate(rows)]
    table = Table(cells, colWidths=widths, repeatRows=1, hAlign='LEFT', spaceBefore=5, spaceAfter=16,
                  splitByRow=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DEEP),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, PALE]),
        ('LINEBELOW', (0, 0), (-1, 0), .6, DEEP),
        ('LINEBELOW', (0, 1), (-1, -1), .4, LINE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 9),
    ]))
    return table


def parse_content(markdown: str, renderer: MarkdownRenderer, style: dict[str, ParagraphStyle]) -> list[Flowable]:
    lines = markdown.splitlines()
    story: list[Flowable] = []
    paragraph: list[str] = []

    def flush() -> None:
        if paragraph:
            text = ' '.join(line.strip() for line in paragraph)
            is_metadata = text.startswith(('**Fecha de edición:**', '**Objeto:**', '**Promotor y administrador inicial:**', '**Situación de esta edición:**'))
            story.append(Paragraph(renderer.inline(text), style['meta' if is_metadata else 'body']))
            paragraph.clear()

    index = 0
    while index < len(lines):
        line = lines[index].rstrip()
        if not line.strip():
            flush()
        elif line.startswith(('# CANTERA', '# LaCantera')) or line.startswith('## Whitepaper del proyecto'):
            flush()
        elif line.startswith('## '):
            flush()
            title = normalise(line[3:])
            anchor = 'sec-' + str(len([item for item in story if isinstance(item, SectionHeading)]))
            story.append(CondPageBreak(115))
            story.append(SectionHeading(renderer.inline(title), style['h2'], anchor, title))
        elif line.startswith('### '):
            flush()
            story.append(CondPageBreak(85))
            story.append(Paragraph(renderer.inline(line[4:]), style['h3']))
        elif line.startswith('|'):
            flush()
            rows: list[list[str]] = []
            while index < len(lines) and lines[index].strip().startswith('|'):
                row = [cell.strip() for cell in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', cell) for cell in row):
                    rows.append(row)
                index += 1
            story.append(make_table(rows, renderer, style))
            continue
        elif re.match(r'^\d+\. ', line):
            flush()
            number, text = line.split('. ', 1)
            story.append(Paragraph(renderer.inline(text), style['list'], bulletText=f'{number}.'))
        elif line.startswith('- '):
            flush()
            story.append(Paragraph(renderer.inline(line[2:]), style['list'], bulletText='-'))
        elif line.startswith('**') and line.endswith('  '):
            flush()
            paragraph.append(line)
            flush()
        else:
            paragraph.append(line)
        index += 1
    flush()
    return story


def build(source: Path, output: Path, publish: bool, expected_sha: str | None) -> dict:
    source_bytes = source.read_bytes()
    source_sha = hashlib.sha256(source_bytes).hexdigest()
    if expected_sha and source_sha != expected_sha:
        raise ValueError(f'La fuente cambió: esperado {expected_sha}; actual {source_sha}')
    markdown = source_bytes.decode('utf-8')
    version_match = re.search(r'Whitepaper del proyecto\s*·\s*Versión\s*([\d.]+)', markdown)
    date_match = re.search(r'\*\*Fecha de edición:\*\*\s*(.+)', markdown)
    status_match = re.search(r'\*\*Situación de esta edición:\*\*\s*(.+)', markdown)
    if not version_match or not date_match or not status_match:
        raise ValueError('La fuente debe declarar versión, fecha y situación de esta edición.')
    version = version_match.group(1)
    date = date_match.group(1).strip()
    register_fonts()
    style = styles()
    renderer = MarkdownRenderer()
    body = parse_content(markdown, renderer, style)
    output.parent.mkdir(parents=True, exist_ok=True)
    document = WhitepaperDocument(str(output), version, pagesize=A4, title=f'LaCantera - Whitepaper del proyecto - v{version}',
                                 author='LaCantera', subject='Misión, producto, gobernanza, sostenibilidad y trazabilidad. Lanzamiento pendiente.',
                                 pageCompression=1)
    contents = TableOfContents()
    contents.levelStyles = [style['toc']]
    contents.dotsMinLevel = 0
    story: list[Flowable] = [Cover(version, date, status_match.group(1).strip()), NextPageTemplate('Body'), PageBreak(),
                             Spacer(1, 18), Paragraph('CONTENIDO', style['eyebrow']),
                             Paragraph('Guía de lectura', style['index_title']),
                             Paragraph('El alcance y la hoja de ruta describen la intención del proyecto. La sección 12 identifica las pruebas realizadas y los pasos pendientes para publicar un servicio real.', style['note']),
                             Spacer(1, 13), contents,
                             PageBreak()]
    story.extend(body)
    story.extend([CondPageBreak(560), SectionHeading('Origen y referencias', style['h2'], 'source-notes', 'Origen y referencias'),
                  Paragraph('Esta edición se ha generado a partir de la fuente editable y versionada del proyecto. Se añaden portada, índice, enlaces y datos de identificación del archivo. Este documento no acredita la aprobación de apertura del servicio.', style['body']),
                  Paragraph(f'<b>Fuente:</b> {html.escape(source.name)}<br/><b>Versión de contenido:</b> {version}<br/><b>Fecha de edición:</b> {html.escape(date)}', style['body']),
                  Paragraph('Huella SHA-256 de la fuente', style['h3']),
                  Paragraph(f'<font name="CanteraMono" size="8.0">{source_sha}</font>', style['body']),
                  Spacer(1, 7), Paragraph('Fuentes enlazadas en el texto', style['h3'])])
    for url, label in renderer.external_links.items():
        story.append(Paragraph(f'<a href="{html.escape(url, quote=True)}" color="#cf302b"><u>{renderer.inline(label)}</u></a><br/><font size="8" color="#696970">{html.escape(url)}</font>', style['body']))
    if renderer.local_references:
        story.extend([Paragraph('Documentación de esta entrega', style['h3']),
                      Paragraph('Las referencias a archivos locales designan documentos del proyecto. Su publicación web deberá acompañar la versión de código a la que se refieren.', style['note'])])
        for path, label in renderer.local_references.items():
            story.append(Paragraph(f'<b>{html.escape(label)}</b><br/><font name="CanteraMono" size="8">{html.escape(path)}</font>', style['body']))
    document.multiBuild(story, canvasmaker=NumberedCanvas)
    reader = PdfReader(output)
    extracted = '\n'.join(page.extract_text() or '' for page in reader.pages)
    annotations = [annotation.get_object() for page in reader.pages for annotation in page.get('/Annots', [])]
    urls = [str(annotation['/A']['/URI']) for annotation in annotations if annotation.get('/A', {}).get('/URI')]
    absent = set(renderer.external_links) - set(urls)
    if absent:
        raise ValueError(f'Enlaces oficiales no incorporados al PDF: {absent}')
    metadata = {
        'source_file': str(source.resolve()), 'source_version': version, 'source_date': date,
        'source_sha256': source_sha, 'pdf_file': str(output.resolve()), 'pages': len(reader.pages),
        'pdf_sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'extracted_text_sha256': hashlib.sha256(extracted.encode('utf-8')).hexdigest(),
        'text_characters': len(extracted), 'section_pages': document.heading_pages,
        'table_pages': sorted(set(document.table_pages)), 'external_sources': renderer.external_links,
        'external_link_annotations': len(urls), 'local_document_references': renderer.local_references,
        'published_download_copy': None,
    }
    if publish:
        public_copy = ROOT / 'public/Cantera-Whitepaper.pdf'
        public_copy.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(output, public_copy)
        if output.read_bytes() != public_copy.read_bytes():
            raise ValueError('La copia pública difiere del PDF original.')
        metadata['published_download_copy'] = str(public_copy)
    output.with_suffix('.metadata.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'WHITEPAPER.md')
    parser.add_argument('--output', type=Path, default=ROOT / 'output/pdf/Cantera-Whitepaper.pdf')
    parser.add_argument('--expected-sha256')
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    print(json.dumps(build(args.source, args.output, args.publish, args.expected_sha256), indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
