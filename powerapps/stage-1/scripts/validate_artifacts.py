"""Check source/fixture contracts; this does not execute Power Fx or test tenant access."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
read=lambda name:json.loads((ROOT/'data'/name).read_text())
model=read('list-definitions.json')
stores={store['name']:{c['name'] for c in store['columns']} for store in model['stores']}
assert len(stores)==len(model['stores'])
for store in model['stores']:
    assert len(stores[store['name']])==len(store['columns']),store['name']
    assert any(c.get('unique') for c in store['columns']),store['name']
    for col in store['columns']:
        if col.get('references'):
            table,name=col['references'].split('.')
            assert name in stores[table],col
cats=read('categories.json')
assert len(cats)==19
ids={c['id'] for c in cats}
assert len(ids)==19
assert {c['id'] for c in cats if not c['isWork']}=={'break','leave','leave-other','sickness'}
fixtures=read('prototype-fixtures.json')
assert len({a['RowId'] for a in fixtures['activities']})==10
assert all(a['CategoryId'] in ids for a in fixtures['activities'])
assert all(15<=a['DurationMinutes']<=480 and a['DurationMinutes']%15==0 for a in fixtures['activities'])
assert sum(a['DurationMinutes'] for a in fixtures['activities'])==885
assert fixtures['profile']['WeeklyHours']==37.5
contract=read('master-workbook-contract.json')
assert contract['tabs']==['Dashboard','Paste plans','Check entries','Team list']
assert len(contract['headers'])==65
assert contract['headers'][58]['cell']=='BG8'
assert contract['headers'][-1]['cell']=='BM8'
assert contract['copyRange']=='A2:BG2'
print('PASS: proposed list relationships, unique keys, category parity, fictional duration fixtures and 59-input-column workbook contract.')
print('These structural checks do not prove permissions, persistence, annual-calculation parity or Power Fx runtime behaviour.')
