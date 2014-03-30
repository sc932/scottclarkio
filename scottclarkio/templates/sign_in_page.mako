<%inherit file="scottclarkio:templates/contact_card_view.mako"/>

<%
from pyramid.security import authenticated_userid
user_id = authenticated_userid(request)
%>
% if user_id:
    Welcome <strong>${user_id}</strong> ::
    <a href="${request.route_url('auth',action='out')}">Sign Out</a>
%else:
    <form action="${request.route_url('auth',action='in')}" method="post">
    <label>User</label><input type="text" name="username">
    <label>Password</label><input type="password" name="password">
    <input type="submit" value="Sign in">
    </form>
%endif
