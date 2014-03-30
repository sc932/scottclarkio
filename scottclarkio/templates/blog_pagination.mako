<%block name="pageblock">
    <table class="table table-bordered">
      <colgroup>
        <col class="span4">
      </colgroup>
      <thead>
        <tr>
          <th><a href="${request.route_url('blog_index')}">Recent Posts</a></th>
        </tr>
      </thead>
      <tbody>
        % if paginator.items:

            % for entry in paginator.items:
            <tr><td>
                <b>${entry.pretty_created}</b> - 
                <a href="${request.route_url('blog', id=entry.id, slug=entry.slug)}">
                ${entry.title}
                </a>
            </td></tr>
            % endfor

        % else:
        <tr>
            <a class="list-group-item">
              <h4>No blog entries found.</h4>
            </a>
        </tr>

        %endif
      </tbody>
    </table>
    ${paginator.pager()}
</%block>
