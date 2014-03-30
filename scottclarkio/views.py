from pyramid.response import Response
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPNotFound, HTTPFound

from sqlalchemy.exc import DBAPIError
from pyramid.security import remember, forget

from .models import (
    DBSession,
    User,
    Entry,
    )
from .forms import BlogCreateForm, BlogUpdateForm

@view_config(route_name='home', renderer='scottclarkio:templates/index.mako')
def index_page(request):
    page = int(request.params.get('page', 1))
    paginator = Entry.get_paginator(request, page)
    return {
        'route_type': 'home',
        'paginator': paginator,
        }

@view_config(route_name='about', renderer='scottclarkio:templates/about.mako')
def about_page(request):
    return {
        'route_type': 'about',
        }

@view_config(route_name='sign_in_page', renderer='scottclarkio:templates/sign_in_page.mako')
def sign_in_page(request):
    return {
        'route_type': 'home',
        }

@view_config(route_name='blog_index', renderer='scottclarkio:templates/blog_index.mako')
def blog_index(request):
    page = int(request.params.get('page', 1))
    paginator = Entry.get_paginator(request, page, items_per_page=3)
    return {
        'route_type': 'blog',
        'paginator': paginator,
        }

@view_config(route_name='blog', renderer='scottclarkio:templates/view_blog.mako')
def blog_view(request):
    id = int(request.matchdict.get('id', -1))
    entry = Entry.by_id(id)
    if not entry:
        return HTTPNotFound()

    page = int(request.params.get('page', 1))
    paginator = Entry.get_paginator(request, page)
    return {
        'route_type': 'blog',
        'main_entry': entry,
        'paginator': paginator,
        }

@view_config(route_name='blog_action',
             match_param='action=create',
             renderer='scottclarkio:templates/edit_blog.mako',
             permission='create')
def blog_create(request):
    entry = Entry()
    form = BlogCreateForm(request.POST)
    if request.method == 'POST' and form.validate():
        form.populate_obj(entry)
        DBSession.add(entry)
        return HTTPFound(location=request.route_url('home'))
    return {
        'route_type': 'blog',
        'form': form,
        'action': request.matchdict.get('action'),
        }

@view_config(route_name='blog_action',
             match_param='action=edit',
             renderer='scottclarkio:templates/edit_blog.mako',
             permission='edit')
def blog_update(request):
    id = int(request.params.get('id', -1))
    entry = Entry.by_id(id)
    if not entry:
        return HTTPNotFound()
    form = BlogUpdateForm(request.POST, entry)
    if request.method == 'POST' and form.validate():
        form.populate_obj(entry)
        return HTTPFound(
                location=request.route_url(
                    'blog',
                    id=entry.id,
                    slug=entry.slug
                    )
                )
    return {'form':form, 'action':request.matchdict.get('action')}

@view_config(route_name='auth', match_param='action=in', renderer='string', request_method='POST')
@view_config(route_name='auth', match_param='action=out', renderer='string')
def sign_in_out(request):
    return {}

@view_config(route_name='auth', match_param='action=in', renderer='string',
             request_method='POST')
@view_config(route_name='auth', match_param='action=out', renderer='string')
def sign_in_out(request):
    username = request.POST.get('username')
    if username:
        user = User.by_name(username)
        if user and user.verify_password(request.POST.get('password')):
            headers = remember(request, user.name)
        else:
            headers = forget(request)
    else:
        headers = forget(request)
    return HTTPFound(location=request.route_url('home'),
                     headers=headers)

conn_err_msg = """\
Pyramid is having a problem using your SQL database.  The problem
might be caused by one of the following things:

1.  You may need to run the "initialize_scottclarkio_db" script
    to initialize your database tables.  Check your virtual 
    environment's "bin" directory for this script and try to run it.

2.  Your database server may not be running.  Check that the
    database server referred to by the "sqlalchemy.url" setting in
    your "development.ini" file is running.

After you fix the problem, please restart the Pyramid application to
try it again.
"""

