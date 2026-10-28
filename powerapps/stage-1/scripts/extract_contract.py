"""Extract category and master-workbook contracts from the actual release HTML."""
from pathlib import Path
from html.parser import HTMLParser
import base64, io, json, re, zipfile
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT.parents[1]/'dist'/'index.html'
s=HTML.read_text()
body=re.search(r'const CATS=\[(.*?)\n\];',s,re.S).group(1)
cats=[]
for row in re.findall(r'\{([^\n]+)\}',body):
    fields=dict(re.findall(r"(\w+):'([^']*)'",row))
    fields['paid']='paid:true' in row
    fields['isWork']=fields['id'] not in ['break','leave','leave-other','sickness']
    cats.append(fields)
(ROOT/'data'/'categories.json').write_text(json.dumps(cats,indent=2,ensure_ascii=False)+'\n')

class Finder(HTMLParser):
    uri=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='a' and 'master-template-download' in a.get('class','').split():self.uri=a.get('href')
finder=Finder();finder.feed(s)
if not finder.uri:raise RuntimeError('Master workbook anchor not found')
raw=base64.b64decode(finder.uri.split(',',1)[1])
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(io.BytesIO(raw)) as z:
    strings=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        strings=[''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)]
    workbook=ET.fromstring(z.read('xl/workbook.xml'))
    tabs=[n.attrib['name'] for n in workbook.findall('m:sheets/m:sheet',ns)]
    paste=ET.fromstring(z.read('xl/worksheets/sheet2.xml'))
    headers=[]
    for cell in paste.findall('.//m:row[@r="8"]/m:c',ns):
        value=cell.find('m:v',ns)
        inline=cell.find('m:is',ns)
        text= strings[int(value.text)] if cell.attrib.get('t')=='s' and value is not None else ''.join(inline.itertext()) if inline is not None else value.text if value is not None else ''
        headers.append({'cell':cell.attrib['r'],'label':text})
    (ROOT/'data'/'master-workbook-contract.json').write_text(json.dumps({'baseline':'2.1.5','tabs':tabs,'copyRange':'A2:BG2','pasteStart':'A9','headers':headers,'source':'embedded master-template-download; template only, no staff data'},indent=2,ensure_ascii=False)+'\n')
print(f'Extracted {len(cats)} categories, {len(tabs)} workbook tabs and {len(headers)} headers.')
