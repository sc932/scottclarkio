from pyramid.config import Configurator
from sqlalchemy import engine_from_config

from pyramid.authentication import AuthTktAuthenticationPolicy
from pyramid.authorization import ACLAuthorizationPolicy
from .security import EntryFactory
from constant import secret_cookie_string

from .models import (
    DBSession,
    Base,
    )


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.bind = engine

    authentication_policy = AuthTktAuthenticationPolicy(secret_cookie_string, hashalg='sha512')
    authorization_policy = ACLAuthorizationPolicy()
    config = Configurator(settings=settings,
                          authentication_policy=authentication_policy,
                          authorization_policy=authorization_policy
                          )
    config.include('pyramid_chameleon')
    config.add_static_view('static', 'static', cache_max_age=3600)
    config.add_route('home', '/')
    config.add_route('sign_in_page', '/signin')
    config.add_route('about', '/about')
    config.add_route('blog_index', '/blog')
    config.add_route('blog', '/blog/{id:\d+}/{slug}')
    config.add_route('blog_action', '/blog/{action}', factory='scottclarkio.security.EntryFactory')
    config.add_route('auth', '/sign/{action}')
    config.scan()
    return config.make_wsgi_app()
