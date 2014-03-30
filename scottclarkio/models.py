import datetime #<- will be used to set default dates on models
import sqlalchemy as sa #<- provides access to sqlalchemy constructs
from sqlalchemy import (
    Column,
    Integer,
    Text,
    Unicode,     #<- will provide unicode field,
    UnicodeText, #<- will provide unicode text field,
    DateTime,    #<- time abstraction field,
    LargeBinary, # For password
    )

from sqlalchemy.ext.declarative import declarative_base

from sqlalchemy.orm import (
    scoped_session,
    sessionmaker,
    synonym,
    )

from zope.sqlalchemy import ZopeTransactionExtension

from webhelpers.text import urlify #<- will generate slugs
from webhelpers.paginate import PageURL_WebOb, Page #<- provides pagination
from webhelpers.date import time_ago_in_words #<- human friendly dates

from cryptacular import bcrypt

crypt = bcrypt.BCRYPTPasswordManager()

DBSession = scoped_session(sessionmaker(extension=ZopeTransactionExtension()))
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(Unicode(255), unique=True, nullable=False)
    password_ = Column('password', LargeBinary(60)) # Hash from bcrypt
    last_logged = Column(DateTime, default=datetime.datetime.utcnow)

    @property
    def password(self):
        return self.password_

    @password.setter
    def password(self, password):
        self.password_ = crypt.encode(password)

    password = synonym('password_', descriptor=password)

    @classmethod
    def by_name(cls, name):
        return DBSession.query(User).filter(User.name == name).first()

    def verify_password(self, password):
        return crypt.check(self.password, password)

class Entry(Base):
    __tablename__ = 'entries'
    id = Column(Integer, primary_key=True)
    title = Column(Unicode(255), unique=True, nullable=False)
    body = Column(UnicodeText, default=u'')
    created = Column(DateTime, default=datetime.datetime.utcnow)
    edited = Column(DateTime, default=datetime.datetime.utcnow)

    @classmethod
    def all(cls):
        return DBSession.query(Entry).order_by(sa.desc(Entry.created))

    @classmethod
    def by_id(cls, id):
        return DBSession.query(Entry).filter(Entry.id == id).first()

    @property
    def slug(self):
        return urlify(self.title)

    @property
    def created_in_words(self):
        return time_ago_in_words(self.created)

    @property
    def pretty_created(self):
        return self.created.strftime("%Y-%m-%d")

    @property
    def blog_pretty_created(self):
        return self.created.strftime("%A, %B %d, %Y")

    @classmethod
    def get_paginator(cls, request, page=1, items_per_page=5):
        page_url = PageURL_WebOb(request)
        return Page(Entry.all(), page, url=page_url, items_per_page=items_per_page)
