<%block name="pageblock">
<h2>Recent Posts</h2>
<hr>
% if paginator.items:

    % for entry in paginator.items:
        <p>
        <h4><a href="${request.route_url('blog', id=entry.id, slug=entry.slug)}">
        ${entry.title}
        </a></h4>
        <h6>By: Scott Clark on ${entry.blog_pretty_created}</h6>
        <p>${ entry.body | n }</p>
        <hr/>
        </p>
    % endfor

% else:
      <h4>No blog entries found.</h4>

%endif

% if paginator.pager():
   More entries: ${paginator.pager()}
% else:
%endif
</%block>
