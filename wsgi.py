from pyramid.paster import get_app

app = get_app('production.ini', 'main')
