"""Build the implementation plan PDF and offline HTML from reviewed Markdown.

Requires reportlab, Pillow and pypdf. No provider calls or client data required.
"""
from __future__ import annotations
import argparse, html, json, re, shutil
from pathlib import Path
from xml.sax.saxutils import escape
import reportlab
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether


def blocks(text):
    lines=text.splitlines(); i=0
    while i<len(lines):
        s=lines[i].strip()
        if not s or s=='[manual-page-break]: #': i+=1; continue
        if s.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                row=[c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+',c) for c in row): rows.append(row)
                i+=1
            yield 'table',rows
        elif re.match(r'^#{1,3} ',s):
            n=len(s.split(' ',1)[0]);yield 'h'+str(n),s[n+1:];i+=1
        elif re.match(r'^(\d+\. |[-*] )',s): yield 'item',s;i+=1
        else:
            p=[s];i+=1
            while i<len(lines) and lines[i].strip(): p.append(lines[i].strip());i+=1
            yield 'p',' '.join(p).removeprefix('> ')


def inline(text):
    out=escape(text)
    out=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',out)
    out=re.sub(r'`([^`]+)`',r'<b>\1</b>',out)
    return re.sub(r'\[([^]]+)\]\((https?://[^)]+)\)',r'<a color="#165d43" href="\2">\1</a>',out)


class PlanDocument(SimpleDocTemplate):
    def afterFlowable(self,f):
        if isinstance(f,Paragraph) and f.style.name=='PlanH2':
            key='section-'+str(self.section_index);self.section_index+=1
            self.canv.bookmarkPage(key);self.canv.addOutlineEntry(f.getPlainText(),key,level=0,closed=False)


def build(output):
    root=Path(__file__).resolve().parents[1]; out=Path(output).resolve();out.mkdir(parents=True,exist_ok=True)
    md=(root/'docs/PLATFORM-IMPLEMENTATION-PLAN.md').read_text(encoding='utf8')
    guide=(root/'docs/guide/01-start-here.md').read_text(encoding='utf8')
    plan=list(blocks(md)); play=list(blocks(guide))
    body=[(k,v) for k,v in plan if k!='h1']+[('h2','29. First-client operator playbook')]+[(('h3' if k=='h2' else k),v) for k,v in play if k!='h1']
    titles=[v for k,v in body if k=='h2']
    font=Path(reportlab.__file__).parent/'fonts'
    for name,file in [('Vera','Vera.ttf'),('Vera-Bold','VeraBd.ttf'),('Vera-Italic','VeraIt.ttf')]:pdfmetrics.registerFont(TTFont(name,str(font/file)))
    pdfmetrics.registerFontFamily('Vera',normal='Vera',bold='Vera-Bold',italic='Vera-Italic',boldItalic='Vera-Bold')
    st=getSampleStyleSheet()
    st.add(ParagraphStyle('Plan',fontName='Vera',fontSize=10,leading=14.5,spaceAfter=9,textColor=colors.HexColor('#20372d')))
    st.add(ParagraphStyle('PlanTitle',parent=st['Plan'],fontName='Vera-Bold',fontSize=31,leading=36,spaceAfter=22))
    st.add(ParagraphStyle('PlanH2',parent=st['Plan'],fontName='Vera-Bold',fontSize=20,leading=25,spaceAfter=18,keepWithNext=True))
    st.add(ParagraphStyle('PlanH3',parent=st['Plan'],fontName='Vera-Bold',fontSize=12,leading=17,spaceBefore=9,spaceAfter=8,keepWithNext=True))
    st.add(ParagraphStyle('PlanCell',parent=st['Plan'],fontSize=8.7,leading=12,spaceAfter=0))
    st.add(ParagraphStyle('PlanItem',parent=st['Plan'],leftIndent=12,firstLineIndent=-12,spaceAfter=8))
    st.add(ParagraphStyle('PlanToc',parent=st['Plan'],fontSize=9.3,leading=13,spaceAfter=7))
    st.add(ParagraphStyle('PlanLabel',parent=st['Plan'],fontName='Vera-Bold',fontSize=9,leading=13,textColor=colors.HexColor('#39725b'),spaceAfter=18))
    pdf=out/'mercatura-client-platform-plan.pdf'
    doc=PlanDocument(str(pdf),pagesize=(595.28,841.89),leftMargin=43,rightMargin=43,topMargin=48,bottomMargin=44,title='Mercatura: new-client launch and agency platform plan',author='Mercatura')
    doc.section_index=0
    story=[Spacer(1,34),Paragraph('MERCATURA / IMPLEMENTATION WORKBOOK',st['PlanLabel']),Paragraph('A clean client start.<br/>A platform that can scale.',st['PlanTitle']),Paragraph('India-first architecture, account connections, agency permissions, accepted-output quality and operating economics.',st['PlanH3']),Spacer(1,18),Paragraph('16 October 2026',st['PlanLabel']),Paragraph('Start with one verified client and one trusted operator. Expand through measured release gates to agency teams and a larger service.',st['Plan']),Spacer(1,18)]
    for heading,detail in [('Tomorrow','Use the empty local starter. Approve a small evidence-led pilot before increasing volume.'),('Hosted launch','Implement identity, tenant-scoped Postgres and objects, durable jobs, encrypted connections and cost reservations.'),('Scale','Prove reconciliation, isolation, recovery, accepted-unit economics and capacity before each rollout gate.')]:
        story.append(KeepTogether([Paragraph(heading,st['PlanH3']),Paragraph(detail,st['Plan'])]))
    story.extend([Spacer(1,22),Paragraph('The current repository is a local starter. Hosted adapters and permissions in this plan are implementation work, not activated services. Cost and capacity scenarios are assumptions, not quotes or guarantees.',st['Plan']),PageBreak(),Paragraph('Contents',st['PlanTitle'])])
    for i,title in enumerate(titles):story.append(Paragraph('<link href="#section-'+str(i)+'">'+escape(title)+'</link>',st['PlanToc']))
    for kind,value in body:
        if kind=='h2':story.extend([PageBreak(),Paragraph(inline(value),st['PlanH2'])])
        elif kind in ('p','item','h3'):story.append(Paragraph(inline(value),st[{'p':'Plan','item':'PlanItem','h3':'PlanH3'}[kind]]))
        elif kind=='table':
            n=len(value[0]); widths=[509.28/n]*n
            if n==3:widths=[119,193,197.28]
            rows=[[Paragraph(inline(c),st['PlanCell']) for c in row] for row in value]
            table=Table(rows,colWidths=widths,repeatRows=1,hAlign='LEFT')
            table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dce9e1')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f2f5f0'),colors.white]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
            story.extend([table,Spacer(1,12)])
    def decorate(canvas,document):
        canvas.saveState();canvas.setFont('Vera',7.5);canvas.setFillColor(colors.HexColor('#5d7468'))
        if document.page>1:canvas.drawString(43,818,'MERCATURA / INDIA-FIRST CLIENT PLATFORM')
        canvas.drawString(43,24,'Implementation plan | 16 October 2026');canvas.drawRightString(552,24,str(document.page));canvas.restoreState()
    doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
    nav=[];parts=[];index=-1
    for kind,value in body:
        if kind=='h2':
            index+=1;nav.append('<a href="#section-'+str(index)+'">'+html.escape(value)+'</a>');parts.append('<h2 id="section-'+str(index)+'">'+inline(value)+'</h2>')
        elif kind in ('p','h3'):parts.append('<'+kind+'>'+inline(value)+'</'+kind+'>')
        elif kind=='item':parts.append('<p class="item">'+inline(value)+'</p>')
        elif kind=='table':parts.append('<div class="table"><table>'+''.join('<tr>'+''.join('<'+('th' if j==0 else 'td')+'>'+inline(c)+'</'+('th' if j==0 else 'td')+'>' for c in row)+'</tr>' for j,row in enumerate(value))+'</table></div>')
    css='*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f5f4ef;color:#20372d;font:17px/1.75 system-ui,sans-serif}aside{position:fixed;width:300px;inset:0 auto 0 0;overflow:auto;background:#e7ede4;padding:25px 21px}aside a{display:block;margin:12px 0;font-size:13px;line-height:1.4;text-decoration:none}main{margin-left:300px;max-width:1200px;padding:35px 55px 90px}h1{font-size:42px;line-height:1.15}h2{font-size:29px;line-height:1.25;margin-top:65px;scroll-margin-top:24px}h3{font-size:21px;margin-top:30px}a{color:#165d43}table{border-collapse:collapse;font-size:14px;line-height:1.6;width:100%}td,th{padding:12px;text-align:left;vertical-align:top}th{background:#dce9e1}tr:nth-child(even){background:#edf2e9}.table{overflow:auto}.actions{padding:18px;border:1px solid #c8d7c9;border-radius:9px;background:white}.actions a{margin-right:20px}.item{padding-left:15px}input{width:100%;padding:8px;font:inherit;font-size:13px;margin:10px 0}@media(max-width:850px){aside{position:static;width:auto;max-height:300px}main{margin:0;padding:22px}h1{font-size:32px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media print{aside,.actions{display:none}main{margin:0;padding:0}h2{break-before:page}table{break-inside:auto}}'
    page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mercatura client platform plan</title><style>'+css+'</style><body><aside><strong>Implementation workbook</strong><label>Find a chapter<input id="find" type="search" placeholder="Try permissions, costs or Slack"></label><nav>'+''.join(nav)+'</nav></aside><main><h1>A clean client start.<br>A platform that can scale.</h1><p>India-first implementation workbook. 16 October 2026.</p><div class="actions"><a href="mercatura-client-platform-plan.pdf">Printable PDF</a><a href="cost-calculator.html">Offline cost calculator</a><p>Architecture and costs are proposed plans. The local starter does not activate hosted integrations.</p></div>'+''.join(parts)+'</main><script>document.getElementById("find").addEventListener("input",e=>{const q=e.target.value.toLowerCase();document.querySelectorAll("nav a").forEach(a=>a.hidden=!a.textContent.toLowerCase().includes(q));});</script></body></html>'
    (out/'index.html').write_text(page,encoding='utf8')
    for file in ['cost-calculator.html','cost-model.js','PLATFORM-IMPLEMENTATION-PLAN.md']:shutil.copy2(root/'docs'/file,out/file)
    stats={'pdfPages':len(PdfReader(pdf).pages),'chapters':len(titles),'words':len(re.findall(r"\b[\w'-]+\b",md+'\n'+guide)),'providerCalls':0}
    (out/'build-validation.json').write_text(json.dumps(stats,indent=2),encoding='utf8');print(json.dumps(stats))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='output/pdf');args=parser.parse_args();build(args.output)
