<%inherit file="scottclarkio:templates/contact_card_view.mako"/>

<h2>${ main_entry.title | n }</h2>
<h6>By: Scott Clark<br>${main_entry.blog_pretty_created}</h6>
<hr/>
<p>${ main_entry.body | n }</p>
<hr/>

<p><a href="${request.route_url('home')}">Go Back</a> ::
<a href="${request.route_url('blog_action', action='edit',
_query=(('id',main_entry.id),))}">Edit Entry</a>

</p>

        <div class="row-fluid">
          <div class="span6">
            <!--comments, links, etc -->
            <%include file="scottclarkio:templates/about_author.mako"/>
          </div>
          <div class="span6">
            <%include file="scottclarkio:templates/blog_pagination.mako"/>
          </div>
        </div>
